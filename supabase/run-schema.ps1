$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhha3lzbnFpcnlpbXhid2RzbHdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA0MjI3NCwiZXhwIjoyMDg1NjE4Mjc0fQ.v0Zw7yFjGKJX8xsMCZJPwRyhr2eNd1gjASsI7qSK0YM"
$accessToken = "sbp_5b15e67cd11ce4fd0768b3c956db8f7968d4f6b1"

$mgmtHeaders = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json; charset=utf-8"
}

function Run-SQL($sql, $label) {
    Write-Host "Running: $label..."
    $body = @{ query = $sql } | ConvertTo-Json -Depth 3
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    try {
        $response = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/hakysnqiryimxbwdslwe/database/query" -Method POST -Headers $mgmtHeaders -Body $bytes -ContentType "application/json; charset=utf-8"
        Write-Host "  OK"
        return $true
    } catch {
        $errBody = ""
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errBody = $reader.ReadToEnd()
        }
        Write-Host "  ERROR: $errBody"
        return $false
    }
}

# 1. Fix: Create unique index
Run-SQL "CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_box_activo ON pacientes (numero_box) WHERE activo = true;" "Unique Index pacientes"

# 2. Create registros_pase table (the main one that failed)
$sql_registros = @"
CREATE TABLE IF NOT EXISTS registros_pase (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE NOT NULL,
  turno_id UUID REFERENCES turnos(id) NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE NOT NULL,
  estado_neurologico TEXT CHECK (estado_neurologico IN ('OTE', 'DOTE', 'CM')),
  signos_vitales_estado TEXT DEFAULT 'Estable',
  hta BOOLEAN DEFAULT false,
  hipotension BOOLEAN DEFAULT false,
  bradicardia BOOLEAN DEFAULT false,
  taquicardia BOOLEAN DEFAULT false,
  febril BOOLEAN DEFAULT false,
  hgt_valor DECIMAL,
  hgt_hora TIME,
  oxigenoterapia TEXT CHECK (oxigenoterapia IN ('AA', 'CN', 'Mascarilla', 'ARM')),
  fio2 INTEGER CHECK (fio2 BETWEEN 21 AND 100),
  sab BOOLEAN DEFAULT false,
  diuresis_tipo TEXT CHECK (diuresis_tipo IN ('Espontanea', 'Sonda', 'Horaria')),
  diuresis_cantidad TEXT CHECK (diuresis_cantidad IN ('+', '++', '(+)', '(-)')),
  catarsis TEXT,
  drogas_vasoactivas JSONB DEFAULT '[]'::jsonb,
  nutricion TEXT CHECK (nutricion IN ('NE', 'NP', 'NVO', 'Oral')),
  via_central_dias INTEGER DEFAULT 0,
  via_periferica_dias INTEGER DEFAULT 0,
  pupilas TEXT CHECK (pupilas IN ('ISO', 'MIO', 'MED', 'MID', 'ANI')),
  escaras BOOLEAN DEFAULT false,
  escaras_detalle TEXT,
  antibioticos JSONB DEFAULT '[]'::jsonb,
  observaciones TEXT,
  enfermero_id UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(paciente_id, turno_id, fecha)
);
"@
Run-SQL $sql_registros "Table registros_pase"

# 3. Create alertas table
$sql_alertas = @"
CREATE TABLE IF NOT EXISTS alertas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT CHECK (tipo IN ('via_central', 'via_periferica', 'hgt', 'escaras', 'antibiotico', 'general')) NOT NULL,
  mensaje TEXT NOT NULL,
  prioridad TEXT CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')) DEFAULT 'media',
  activa BOOLEAN DEFAULT true,
  vista BOOLEAN DEFAULT false,
  vista_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
"@
Run-SQL $sql_alertas "Table alertas"

# 4. Create historial_cambios table  
$sql_historial = @"
CREATE TABLE IF NOT EXISTS historial_cambios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  registro_pase_id UUID REFERENCES registros_pase(id) ON DELETE CASCADE,
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_id UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
"@
Run-SQL $sql_historial "Table historial_cambios"

# 5. Create indexes
Run-SQL "CREATE INDEX IF NOT EXISTS idx_registros_fecha ON registros_pase(fecha);" "Index registros_fecha"
Run-SQL "CREATE INDEX IF NOT EXISTS idx_registros_paciente ON registros_pase(paciente_id);" "Index registros_paciente"
Run-SQL "CREATE INDEX IF NOT EXISTS idx_registros_turno ON registros_pase(turno_id);" "Index registros_turno"
Run-SQL "CREATE INDEX IF NOT EXISTS idx_alertas_activas ON alertas(activa) WHERE activa = true;" "Index alertas_activas"
Run-SQL "CREATE INDEX IF NOT EXISTS idx_alertas_paciente ON alertas(paciente_id);" "Index alertas_paciente"
Run-SQL "CREATE INDEX IF NOT EXISTS idx_pacientes_activos ON pacientes(activo) WHERE activo = true;" "Index pacientes_activos"

# 6. Enable RLS
Run-SQL "ALTER TABLE registros_pase ENABLE ROW LEVEL SECURITY;" "RLS registros_pase"
Run-SQL "ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;" "RLS alertas"
Run-SQL "ALTER TABLE historial_cambios ENABLE ROW LEVEL SECURITY;" "RLS historial_cambios"

# 7. Policies
Run-SQL "CREATE POLICY ""read_auth_registros"" ON registros_pase FOR SELECT TO authenticated USING (true);" "Policy registros auth read"
Run-SQL "CREATE POLICY ""read_auth_alertas"" ON alertas FOR SELECT TO authenticated USING (true);" "Policy alertas auth read"
Run-SQL "CREATE POLICY ""read_auth_historial"" ON historial_cambios FOR SELECT TO authenticated USING (true);" "Policy historial auth read"
Run-SQL "CREATE POLICY ""read_anon_registros"" ON registros_pase FOR SELECT TO anon USING (true);" "Policy registros anon read"
Run-SQL "CREATE POLICY ""read_anon_alertas"" ON alertas FOR SELECT TO anon USING (true);" "Policy alertas anon read"
Run-SQL "CREATE POLICY ""read_anon_historial"" ON historial_cambios FOR SELECT TO anon USING (true);" "Policy historial anon read"
Run-SQL "CREATE POLICY ""insert_anon_registros"" ON registros_pase FOR INSERT TO anon WITH CHECK (true);" "Policy registros anon insert"
Run-SQL "CREATE POLICY ""update_anon_registros"" ON registros_pase FOR UPDATE TO anon USING (true);" "Policy registros anon update"
Run-SQL "CREATE POLICY ""insert_anon_alertas"" ON alertas FOR INSERT TO anon WITH CHECK (true);" "Policy alertas anon insert"
Run-SQL "CREATE POLICY ""update_anon_alertas"" ON alertas FOR UPDATE TO anon USING (true);" "Policy alertas anon update"
Run-SQL "CREATE POLICY ""insert_anon_historial"" ON historial_cambios FOR INSERT TO anon WITH CHECK (true);" "Policy historial anon insert"

# 8. Seed data
$sql_seed_users = @"
INSERT INTO usuarios (nombre, apellido, matricula, rol) VALUES
  ('Yurby', 'Gonzalez', 'ENF-001', 'enfermero'),
  ('Pamela', 'Vega', 'ENF-002', 'enfermero'),
  ('Marcos', 'Vilchez', 'ENF-003', 'enfermero'),
  ('Romina', 'Herrera', 'ENF-004', 'enfermero'),
  ('Natalia', 'Rojos', 'ENF-005', 'enfermero'),
  ('Sol', 'Cicero', 'ENF-006', 'enfermero'),
  ('Maxima', 'Buniel', 'ENF-007', 'enfermero'),
  ('Beatriz', 'Olivera', 'ENF-008', 'enfermero'),
  ('Sabrina', 'Videla', 'ENF-009', 'enfermero'),
  ('Lorena', 'Tello', 'ENF-010', 'enfermero'),
  ('Yamila', 'Tejada', 'ENF-011', 'enfermero'),
  ('Lucas', 'Coordinador', 'ENF-012', 'enfermero_jefe')
ON CONFLICT (matricula) DO NOTHING;
"@
Run-SQL $sql_seed_users "Seed usuarios"

$sql_seed_patients = @"
INSERT INTO pacientes (numero_box, apellido, nombre, diagnostico_principal, estado_actual, fecha_ingreso) VALUES
  (1, 'Andrade', 'Carlos', 'IAM con elevacion ST', 'critico', NOW() - INTERVAL '12 days'),
  (2, 'Rodriguez', 'Maria', 'EPOC reagudizado', 'atencion', NOW() - INTERVAL '5 days'),
  (3, 'Alvarez', 'Jorge', 'Neumonia bilateral', 'estable', NOW() - INTERVAL '8 days'),
  (4, 'Martinez', 'Elena', 'Post-operatorio bypass', 'critico', NOW() - INTERVAL '3 days'),
  (5, 'Lopez', 'Carlos', 'Insuficiencia respiratoria', 'estable', NOW() - INTERVAL '15 days'),
  (6, 'Vicuello', 'Ana', 'ACV isquemico', 'atencion', NOW() - INTERVAL '7 days'),
  (7, 'Fernandez', 'Luis', 'Politraumatismo', 'estable', NOW() - INTERVAL '10 days'),
  (8, 'Gonzalez', 'Pedro', 'Sepsis urinaria', 'estable', NOW() - INTERVAL '4 days'),
  (9, 'Sanchez', 'Rosa', 'Cetoacidosis diabetica', 'atencion', NOW() - INTERVAL '2 days'),
  (10, 'Paez', 'Roberto', 'Pancreatitis aguda', 'estable', NOW() - INTERVAL '6 days')
ON CONFLICT DO NOTHING;
"@
Run-SQL $sql_seed_patients "Seed pacientes"

Write-Host "`nAll done!"
