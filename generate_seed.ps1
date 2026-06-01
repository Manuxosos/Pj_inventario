Add-Type -Assembly System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("C:\Users\User\Downloads\inventariomaster (2).xlsx")
$ssEntry = $zip.Entries | Where-Object { $_.FullName -eq "xl/sharedStrings.xml" }
$reader = New-Object System.IO.StreamReader($ssEntry.Open())
$ssXml = [xml]$reader.ReadToEnd(); $reader.Close()
$s1Entry = $zip.Entries | Where-Object { $_.FullName -eq "xl/worksheets/sheet1.xml" }
$reader = New-Object System.IO.StreamReader($s1Entry.Open())
$s1Xml = [xml]$reader.ReadToEnd(); $reader.Close()
$zip.Dispose()

$ss = @()
foreach ($si in $ssXml.sst.si) {
    $ss += (($si.SelectNodes('.//*[local-name()="t"]') | ForEach-Object { $_.'#text' }) -join '')
}

$allRows = @{}
foreach ($row in $s1Xml.worksheet.sheetData.row) {
    $rn = [int]$row.r
    $rd = @{}
    foreach ($c in $row.c) {
        $col = [regex]::Match($c.r, '[A-Z]+').Value
        $val = $c.v
        if ($c.t -eq 's' -and $val) { $val = $ss[[int]$val] } elseif (!$val) { $val = '' }
        $rd[$col] = $val
    }
    $allRows[$rn] = $rd
}

function getCell($r, $k) {
    $v = $r[$k]
    if (!$v) { return '' }
    # Strip trailing .0 from numeric values (Excel stores integers as floats)
    if ($v -match '^\d+\.0$') { return [string][int]([double]$v) }
    return $v
}

$script:currentFloor = ''
$equipos = New-Object System.Collections.ArrayList
$seen = @{}

foreach ($rn in ($allRows.Keys | Sort-Object)) {
    if ($rn -le 1) { continue }
    $r = $allRows[$rn]

    $aVal   = getCell $r 'A'
    $serial = getCell $r 'J'
    $model  = getCell $r 'E'

    if ($aVal -match '^PISO\s+\d+$' -or $aVal -eq 'BODEGA') {
        $script:currentFloor = $aVal
        continue
    }

    if (-not $serial -or -not $model) { continue }
    if ($seen[$serial]) { continue }
    $seen[$serial] = $true

    $obj = New-Object PSObject -Property @{
        id_activo        = $aVal
        cargador         = getCell $r 'B'
        id_ex            = getCell $r 'C'
        team             = getCell $r 'D'
        marca_modelo     = $model
        procesador       = getCell $r 'F'
        ram              = getCell $r 'G'
        disco_duro       = getCell $r 'H'
        so               = getCell $r 'I'
        numero_serie     = $serial
        usuario          = getCell $r 'K'
        estado           = getCell $r 'M'
        observacion      = getCell $r 'N'
        responsable      = getCell $r 'O'
        audifonos        = getCell $r 'P'
        mouse            = getCell $r 'Q'
        monitor          = getCell $r 'R'
        adaptador_tplink = getCell $r 'S'
        estuche          = getCell $r 'T'
        piso             = $script:currentFloor
    }
    $null = $equipos.Add($obj)
}

Write-Output "Total: $($equipos.Count)"
$equipos | Group-Object piso | Sort-Object Name | ForEach-Object { "  '$($_.Name)': $($_.Count) equipos" }

$equipos | ConvertTo-Json -Depth 2 | Out-File "C:\Users\User\Documents\ProyectoInventario\seed_data.json" -Encoding utf8
Write-Output "Guardado en seed_data.json"
