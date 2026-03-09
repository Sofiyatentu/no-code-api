$ErrorActionPreference = "Stop"
$base = "http://localhost:5000"
$rand = Get-Random -Maximum 99999

Write-Host "=== FULL WORKFLOW TEST ===" -ForegroundColor Cyan

# 1. SIGNUP
$sb = (@{email="e$rand@t.com";username="u$rand";password="Test1234!";firstName="A";lastName="B"} | ConvertTo-Json)
$r = Invoke-WebRequest -Uri "$base/api/auth/signup" -Method POST -ContentType "application/json" -Body $sb -UseBasicParsing
$d = $r.Content | ConvertFrom-Json
$token = $d.token; $uname = $d.user.username
$h = @{ Authorization = "Bearer $token" }
Write-Host "1. SIGNUP OK  User=$uname" -ForegroundColor Green

# 2. CREATE PROJECT
$r2 = Invoke-WebRequest -Uri "$base/api/projects" -Method POST -ContentType "application/json" -Headers $h -Body '{"name":"E2E Test","description":"Full workflow"}' -UseBasicParsing
$proj = $r2.Content | ConvertFrom-Json
$projId = $proj.id; $slug = $proj.slug
Write-Host "2. PROJECT OK  ID=$projId Slug=$slug" -ForegroundColor Green

# 3. CREATE FLOW
$r3 = Invoke-WebRequest -Uri "$base/api/flows/project/$projId" -Method POST -ContentType "application/json" -Headers $h -Body '{"name":"Main Flow"}' -UseBasicParsing
$flow = $r3.Content | ConvertFrom-Json
$flowId = $flow.id
Write-Host "3. FLOW OK  ID=$flowId" -ForegroundColor Green

# 4. SAVE FLOW NODES+EDGES (using type:"custom" + data.nodeType like the frontend)
$flowBody = @{
  nodes = @(
    @{id="n1";type="custom";position=@{x=0;y=0};data=@{nodeType="httpMethod";config=@{method="GET";path="/"};label="GET /"}}
    @{id="n2";type="custom";position=@{x=300;y=0};data=@{nodeType="transform";config=@{expression='{"greeting":"Hello!","ts":"{{new Date().toISOString()}}"}'}; label="Transform"}}
    @{id="n3";type="custom";position=@{x=600;y=0};data=@{nodeType="response";config=@{statusCode=200;body='{{$.n2}}'}; label="Response"}}
  )
  edges = @(
    @{id="e1";source="n1";target="n2"}
    @{id="e2";source="n2";target="n3"}
  )
} | ConvertTo-Json -Depth 10
$r4 = Invoke-WebRequest -Uri "$base/api/flows/$flowId" -Method PATCH -ContentType "application/json" -Headers $h -Body $flowBody -UseBasicParsing
$updated = $r4.Content | ConvertFrom-Json
Write-Host "4. SAVE OK  Version=$($updated.version) Nodes=$($updated.nodes.Count)" -ForegroundColor Green

# 5. DEPLOY FLOW
$r5 = Invoke-WebRequest -Uri "$base/api/flows/$flowId/deploy" -Method POST -ContentType "application/json" -Headers $h -Body '{}' -UseBasicParsing
$dep = $r5.Content | ConvertFrom-Json
Write-Host "5. DEPLOY OK  Deployed=$($dep.flow.deployed)" -ForegroundColor Green

# 6. ACTIVATE PROJECT
$r6 = Invoke-WebRequest -Uri "$base/api/projects/$projId" -Method PATCH -ContentType "application/json" -Headers $h -Body '{"status":"active"}' -UseBasicParsing
$act = $r6.Content | ConvertFrom-Json
Write-Host "6. ACTIVATE OK  Status=$($act.status)" -ForegroundColor Green

# 7. CREATE API KEY
$r7 = Invoke-WebRequest -Uri "$base/api/projects/$projId/api-keys" -Method POST -ContentType "application/json" -Headers $h -Body '{"name":"test-key"}' -UseBasicParsing
$apikey = ($r7.Content | ConvertFrom-Json).key
Write-Host "7. API KEY OK  Key=$($apikey.Substring(0,12))..." -ForegroundColor Green

# 8. HIT PUBLIC URL (no API key)
$gwUrl = "$base/$uname/$slug/"
$r8 = Invoke-WebRequest -Uri $gwUrl -Method GET -UseBasicParsing
Write-Host "8. GATEWAY OK (no key)  Status=$($r8.StatusCode) Body=$($r8.Content)" -ForegroundColor Green

# 9. HIT WITH API KEY
$r9 = Invoke-WebRequest -Uri $gwUrl -Method GET -Headers @{"x-api-key"=$apikey} -UseBasicParsing
Write-Host "9. GATEWAY+KEY OK  Status=$($r9.StatusCode) Body=$($r9.Content)" -ForegroundColor Green

# 10. CHECK LOGS
$r10 = Invoke-WebRequest -Uri "$base/api/logs/project/$projId" -Method GET -Headers $h -UseBasicParsing
$logs = $r10.Content | ConvertFrom-Json
Write-Host "10. LOGS OK  Count=$($logs.count)" -ForegroundColor Green
if ($logs.logs -and $logs.logs.Count -gt 0) {
    $l = $logs.logs[0]
    Write-Host "    Latest: $($l.method) $($l.path) -> $($l.status) ($($l.duration)ms)" -ForegroundColor Gray
}

# 11. FETCH PROJECT BY ID (Playground page needs this)
$r11 = Invoke-WebRequest -Uri "$base/api/projects/$projId" -Method GET -Headers $h -UseBasicParsing
$single = $r11.Content | ConvertFrom-Json
Write-Host "11. GET PROJECT OK  Name=$($single.name) Slug=$($single.slug)" -ForegroundColor Green

# 12. FETCH FLOW DETAIL (Builder page needs this)
$r12 = Invoke-WebRequest -Uri "$base/api/flows/$flowId" -Method GET -Headers $h -UseBasicParsing
$fd = $r12.Content | ConvertFrom-Json
Write-Host "12. GET FLOW OK  Deployed=$($fd.deployed) Nodes=$($fd.nodes.Count)" -ForegroundColor Green

Write-Host ""
Write-Host "=== ALL 12 STEPS PASSED ===" -ForegroundColor Cyan
Write-Host "Public URL: $gwUrl" -ForegroundColor White
Write-Host "API Key:    $apikey" -ForegroundColor White
