#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Runtime = Join-Path (Split-Path -Parent $Root) 'runtime'
$Zip = Join-Path $env:TEMP 'node-win-x64.zip'
$Url = 'https://nodejs.org/dist/v18.20.8/node-v18.20.8-win-x64.zip'

Write-Host 'Descargando Node.js 18 (Windows x64)...'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $Url -OutFile $Zip -UseBasicParsing

Write-Host 'Extrayendo...'
Expand-Archive -Path $Zip -DestinationPath $env:TEMP -Force
$Extracted = Join-Path $env:TEMP 'node-v18.20.8-win-x64'

New-Item -ItemType Directory -Path $Runtime -Force | Out-Null
Copy-Item (Join-Path $Extracted 'node.exe') $Runtime -Force
Copy-Item (Join-Path $Extracted 'npm.cmd') $Runtime -Force
Copy-Item (Join-Path $Extracted 'npx.cmd') $Runtime -Force
Copy-Item (Join-Path $Extracted 'node_modules') (Join-Path $Runtime 'node_modules') -Recurse -Force

Remove-Item $Zip -Force -ErrorAction SilentlyContinue
Remove-Item $Extracted -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'Node.js listo en runtime\'
