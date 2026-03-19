$token = "sbp_5b15e67cd11ce4fd0768b3c956db8f7968d4f6b1"
$projectRef = "hakysnqiryimxbwdslwe"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test first to see what format the API needs
$testSql = "SELECT 1 as test;"
$body = ConvertTo-Json @{ query = $testSql } -Compress

Write-Host "Testing API connection..."
try {
    $resp = Invoke-WebRequest -Uri "https://api.supabase.com/v1/projects/$projectRef/database/query" -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -ContentType "application/json" -UseBasicParsing
    Write-Host "Status: $($resp.StatusCode)"
    Write-Host "Response: $($resp.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errContent = $reader.ReadToEnd()
        Write-Host "Body: $errContent"
    }
}
