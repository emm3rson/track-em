$ErrorActionPreference = "Stop"

Write-Host "UI layering audit (quick scan)"

$targets = @("src/features", "src/components", "src/ui", "src/navigation", "src/shell") |
  Where-Object { Test-Path $_ }

$rgCommand = Get-Command rg -ErrorAction SilentlyContinue

function Invoke-AuditSearch {
  param(
    [string]$Pattern,
    [string[]]$Paths
  )

  if ($null -ne $rgCommand) {
    & rg -n --no-messages $Pattern $Paths
    return
  }

  $files = foreach ($path in $Paths) {
    Get-ChildItem -Path $path -Recurse -File -Include *.ts,*.tsx | Select-Object -ExpandProperty FullName
  }

  if (-not $files) {
    return
  }

  Select-String -Path $files -Pattern $Pattern | ForEach-Object {
    "{0}:{1}:{2}" -f $_.Path, $_.LineNumber, $_.Line.Trim()
  }
}

if ($targets.Count -eq 0) {
  throw "No frontend target paths found."
}

Write-Host "`n1) Inline surface fills (candidate for InnerCard/FieldShell):"
Invoke-AuditSearch "backgroundColor:\s*colors\.surfaceAlt|backgroundColor:\s*colors\.surfaceMuted" $targets

Write-Host "`n2) Transparent field backgrounds:"
Invoke-AuditSearch 'backgroundColor:\s*"transparent"' $targets

Write-Host "`n3) Absolute overlays (review for full-row tint side effects):"
Invoke-AuditSearch 'position:\s*"absolute"' $targets

Write-Host "`nDone."
