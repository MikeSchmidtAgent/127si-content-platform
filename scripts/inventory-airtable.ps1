param(
  [string]$BaseId = "appn84sqPw03zEbTT",
  [string]$TableId = "tblDOTgsWfqPm18bw",
  [string]$OutputPath = "work/airtable-inventory.json"
)

$ErrorActionPreference = "Stop"
$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory) { New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null }

$json = airtable-mcp list-records-for-table --baseId $BaseId --tableId $TableId --pageSize 100 --output raw -q
if (-not $json) { throw "Airtable returned no inventory data." }

$json | Set-Content -Path $OutputPath -Encoding utf8
Write-Host "Inventory written to $OutputPath"
