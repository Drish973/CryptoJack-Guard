# scripts/generate-icons.ps1

Add-Type -AssemblyName System.Drawing
$sizes = @(16, 32, 48, 128)

# Resolve parent directory path
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (!$scriptDir) {
    $scriptDir = Get-Location
}
$iconsDir = Join-Path $scriptDir "..\icons"

if (!(Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Force -Path $iconsDir
}

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Configure high-quality rendering
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # 1. Paint a dark navy blue shield body
    $shieldColor = [System.Drawing.Color]::FromArgb(255, 15, 23, 42) # #0F172A
    $brush = New-Object System.Drawing.SolidBrush ($shieldColor)
    
    # 2. Paint a glowing cyan/teal outline
    $outlineColor = [System.Drawing.Color]::FromArgb(255, 6, 182, 212) # #06B6D4
    $penWidth = [Math]::Max(1.0, $size * 0.08)
    $pen = New-Object System.Drawing.Pen ($outlineColor, $penWidth)
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    
    # Define shield outline control points
    $p1 = New-Object System.Drawing.PointF ($size * 0.5), ($size * 0.08)   # Top Center
    $p2 = New-Object System.Drawing.PointF ($size * 0.86), ($size * 0.22)  # Top Right
    $p3 = New-Object System.Drawing.PointF ($size * 0.86), ($size * 0.54)  # Middle Right
    $p4 = New-Object System.Drawing.PointF ($size * 0.5), ($size * 0.90)   # Bottom Tip
    $p5 = New-Object System.Drawing.PointF ($size * 0.14), ($size * 0.54)  # Middle Left
    $p6 = New-Object System.Drawing.PointF ($size * 0.14), ($size * 0.22)  # Top Left
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    
    # Create the shield geometry
    $path.AddLine($p1, $p2)
    $path.AddCurve(@($p2, $p3, $p4))
    $path.AddCurve(@($p4, $p5, $p6))
    $path.AddLine($p6, $p1)
    $path.CloseAllFigures()
    
    $g.FillPath($brush, $path)
    $g.DrawPath($pen, $path)
    
    # 3. Draw a sharp yellow/gold lightning bolt in the center
    # Adjust bolt geometry based on size
    $goldColor = [System.Drawing.Color]::FromArgb(255, 245, 158, 11) # #F59E0B
    $boltBrush = New-Object System.Drawing.SolidBrush ($goldColor)
    
    # Lightning bolt coordinates relative to shield size
    $bp1 = New-Object System.Drawing.PointF ($size * 0.56), ($size * 0.24)
    $bp2 = New-Object System.Drawing.PointF ($size * 0.36), ($size * 0.52)
    $bp3 = New-Object System.Drawing.PointF ($size * 0.50), ($size * 0.52)
    $bp4 = New-Object System.Drawing.PointF ($size * 0.44), ($size * 0.78)
    $bp5 = New-Object System.Drawing.PointF ($size * 0.64), ($size * 0.48)
    $bp6 = New-Object System.Drawing.PointF ($size * 0.50), ($size * 0.48)
    
    $boltPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $boltPath.AddPolygon(@($bp1, $bp2, $bp3, $bp4, $bp5, $bp6))
    
    $g.FillPath($boltBrush, $boltPath)
    
    # Save image
    $destPath = Join-Path $iconsDir "icon$size.png"
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup resources
    $brush.Dispose()
    $pen.Dispose()
    $boltBrush.Dispose()
    $path.Dispose()
    $boltPath.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

Write-Host "All CryptoJack Guard PNG icons generated successfully in: $iconsDir"
