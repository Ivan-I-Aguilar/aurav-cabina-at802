# Genera voz/<clave>.wav (16 kHz mono) para cada frase de voz/frases.json con la voz Sabina (es-MX) de Windows.
# Sólo genera las que faltan. Uso: powershell -ExecutionPolicy Bypass -File herramientas/voces.ps1
Add-Type -AssemblyName System.Speech
$raiz = Split-Path -Parent $PSScriptRoot
$frases = Get-Content (Join-Path $raiz 'voz/frases.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice('Microsoft Sabina Desktop'); $s.Rate = 1
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$n = 0
foreach ($p in $frases.PSObject.Properties) {
  $wav = Join-Path $raiz ("voz/" + $p.Name + ".wav")
  if (Test-Path $wav) { continue }
  $s.SetOutputToWaveFile($wav, $fmt); $s.Speak($p.Value); $n++
}
$s.SetOutputToNull(); $s.Dispose()
"$n audios nuevos"
