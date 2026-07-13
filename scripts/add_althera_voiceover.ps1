$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$wav = Join-Path $root "exports\althera_voiceover.wav"

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo }
$spanish = $voices | Where-Object { $_.Culture.Name -like "es-*" } | Select-Object -First 1
if ($spanish) {
    $synth.SelectVoice($spanish.Name)
}
$synth.Rate = 1
$synth.Volume = 95
$synth.SetOutputToWaveFile($wav)

$text = @"
Althera Solutions es una boutique de desarrollo tecnologico creada para convertir ideas de negocio en productos digitales solidos, elegantes y escalables.
Disenamos y programamos plataformas SaaS, paginas web premium, paneles internos, CRM, calendarios, sistemas de contratos, finanzas, automatizaciones y experiencias digitales orientadas a conversion.
Nuestro trabajo combina estrategia, diseno de interaccion, codigo limpio y arquitectura cloud. Primero entendemos el objetivo del cliente. Despues definimos pantallas, flujos y estructura tecnica. Finalmente desarrollamos por modulos, probamos, lanzamos y seguimos mejorando con datos reales.
Este ano el objetivo es crecer con foco: trabajar con mas personas, aumentar ingresos y llevar a cabo mas proyectos sin perder calidad. Para conseguirlo ampliaremos el equipo, reforzaremos ventas, mejoraremos procesos repetibles y construiremos mas casos reales.
Althera no crea solo webs. Creamos sistemas digitales que ayudan a operar mejor, vender mejor y escalar con una presencia tecnologica fuerte.
"@

$synth.Speak($text)
$synth.Dispose()
Write-Output $wav
