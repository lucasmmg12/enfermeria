-- ============================================
-- SANATORIO ARGENTINO — Enfermería UTI
-- Schema: Pase de Guardia Digital
-- PREFIJO: enf_ (NO tocar tablas de ADM-QUI)
--
-- ⚠️ SEGURO: Solo crea tablas enf_*
-- No borra ni modifica ninguna tabla existente
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENF_USUARIOS (Personal de Enfermería)
-- ============================================
CREATE TABLE IF NOT EXISTS enf_usuarios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'enfermero' CHECK (rol IN ('enfermero', 'coordinador', 'admin')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ENF_INTERNACIONES (Paciente en Box)
-- Vincula hospital_pacientes (READ-ONLY) con un box
-- ============================================
CREATE TABLE IF NOT EXISTS enf_internaciones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hospital_paciente_id BIGINT NOT NULL,
  numero_box INTEGER NOT NULL CHECK (numero_box BETWEEN 1 AND 16),
  diagnostico_ingreso TEXT NOT NULL,
  medico_tratante TEXT,
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_egreso DATE,
  motivo_egreso TEXT CHECK (motivo_egreso IN ('alta_medica', 'derivacion_piso', 'obito', 'traslado_externo')),
  estado_actual TEXT NOT NULL DEFAULT 'estable' CHECK (estado_actual IN ('estable', 'atencion', 'critico')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Solo un paciente activo por box
CREATE UNIQUE INDEX IF NOT EXISTS idx_enf_internaciones_box_activo
  ON enf_internaciones (numero_box) WHERE activo = true;

-- ============================================
-- ENF_PASES (Sesión de Pase de Guardia)
-- ============================================
CREATE TABLE IF NOT EXISTS enf_pases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  turno TEXT NOT NULL CHECK (turno IN ('Manana', 'Tarde', 'Noche')),
  enfermero_saliente_id UUID REFERENCES enf_usuarios(id),
  enfermero_entrante_id UUID REFERENCES enf_usuarios(id),
  hora_inicio TIMESTAMPTZ DEFAULT now(),
  hora_fin TIMESTAMPTZ,
  estado TEXT NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('en_curso', 'completado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Un pase por turno por día
CREATE UNIQUE INDEX IF NOT EXISTS idx_enf_pases_turno_fecha
  ON enf_pases (fecha, turno);

-- ============================================
-- ENF_REGISTROS (Novedad por paciente en un pase)
-- ============================================
CREATE TABLE IF NOT EXISTS enf_registros (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pase_id UUID REFERENCES enf_pases(id) ON DELETE CASCADE,
  internacion_id UUID NOT NULL REFERENCES enf_internaciones(id),

  -- Identificadores ITAES (3 obligatorios)
  paciente_nombre TEXT NOT NULL,
  paciente_edad INTEGER,
  paciente_box INTEGER NOT NULL,

  -- Evaluación clínica
  estado_neurologico TEXT DEFAULT 'OTE',
  signos_vitales_estado TEXT DEFAULT 'Estable',
  hta BOOLEAN DEFAULT false,
  hipotension BOOLEAN DEFAULT false,
  bradicardia BOOLEAN DEFAULT false,
  taquicardia BOOLEAN DEFAULT false,
  febril BOOLEAN DEFAULT false,
  hgt_valor NUMERIC,

  -- Respiratorio
  oxigenoterapia TEXT DEFAULT 'AA',
  fio2 INTEGER DEFAULT 21,
  sab BOOLEAN DEFAULT false,

  -- Eliminación
  diuresis_tipo TEXT DEFAULT 'Espontanea',
  diuresis_cantidad TEXT DEFAULT '+',
  catarsis TEXT,

  -- Medicación
  drogas_vasoactivas JSONB DEFAULT '[]'::jsonb,
  antibioticos JSONB DEFAULT '[]'::jsonb,

  -- Nutrición
  nutricion TEXT DEFAULT 'Oral',

  -- Dispositivos
  via_central_dias INTEGER DEFAULT 0,
  via_periferica_dias INTEGER DEFAULT 0,

  -- Evaluación
  pupilas TEXT DEFAULT 'ISO',
  escaras BOOLEAN DEFAULT false,
  escaras_detalle TEXT,

  -- Novedades
  observaciones TEXT,
  resumen_ia TEXT,

  -- Auditoría
  registrado_por UUID REFERENCES enf_usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ENF_AUDIOS (Grabaciones de audio del pase)
-- ============================================
CREATE TABLE IF NOT EXISTS enf_audios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  registro_id UUID REFERENCES enf_registros(id) ON DELETE CASCADE,
  internacion_id UUID REFERENCES enf_internaciones(id),
  storage_path TEXT NOT NULL,
  transcripcion TEXT,
  duracion_segundos INTEGER,
  procesado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ENF_ALERTAS (Alertas clínicas)
-- ============================================
CREATE TABLE IF NOT EXISTS enf_alertas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  internacion_id UUID NOT NULL REFERENCES enf_internaciones(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('critico', 'dispositivo', 'medicacion', 'general')),
  mensaje TEXT NOT NULL,
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  resuelta_at TIMESTAMPTZ,
  resuelta_por UUID REFERENCES enf_usuarios(id)
);

-- ============================================
-- INDEXES (idempotentes con IF NOT EXISTS)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_enf_internaciones_activo ON enf_internaciones(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_enf_internaciones_hospital_pac ON enf_internaciones(hospital_paciente_id);
CREATE INDEX IF NOT EXISTS idx_enf_registros_pase ON enf_registros(pase_id);
CREATE INDEX IF NOT EXISTS idx_enf_registros_internacion ON enf_registros(internacion_id);
CREATE INDEX IF NOT EXISTS idx_enf_alertas_activa ON enf_alertas(activa) WHERE activa = true;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE enf_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE enf_internaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE enf_pases ENABLE ROW LEVEL SECURITY;
ALTER TABLE enf_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE enf_audios ENABLE ROW LEVEL SECURITY;
ALTER TABLE enf_alertas ENABLE ROW LEVEL SECURITY;

-- Policies (idempotentes: solo crea si no existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enf_full_access' AND tablename = 'enf_usuarios') THEN
    CREATE POLICY "enf_full_access" ON enf_usuarios FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enf_full_access' AND tablename = 'enf_internaciones') THEN
    CREATE POLICY "enf_full_access" ON enf_internaciones FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enf_full_access' AND tablename = 'enf_pases') THEN
    CREATE POLICY "enf_full_access" ON enf_pases FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enf_full_access' AND tablename = 'enf_registros') THEN
    CREATE POLICY "enf_full_access" ON enf_registros FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enf_full_access' AND tablename = 'enf_audios') THEN
    CREATE POLICY "enf_full_access" ON enf_audios FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'enf_full_access' AND tablename = 'enf_alertas') THEN
    CREATE POLICY "enf_full_access" ON enf_alertas FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- SEED DATA: Test users (solo inserta si no existen)
-- ============================================
INSERT INTO enf_usuarios (nombre, apellido, email, password_hash, rol) VALUES
  ('Administrador', 'Sistema', 'admin', '123456', 'admin'),
  ('Lucas', 'Coordinador', 'lucas', '123456', 'coordinador'),
  ('Maria', 'Gomez', 'maria', '123456', 'enfermero'),
  ('Juan', 'Perez', 'juan', '123456', 'enfermero')
ON CONFLICT (email) DO NOTHING;
