param(
  [string]$Url = "http://localhost:3000/analytics/track",
  [string]$PlayerId = "test_player",
  [string]$SessionId = "session_test_$(Get-Date -UFormat %s)",
  [int]$Steps = 6,
  [int]$DelayMs = 500
)

function PostEvent($eventType, $data) {
  $body = @{ event = $eventType; data = $data; timestamp = [int64](Get-Date -UFormat %s) * 1000 } | ConvertTo-Json -Depth 10
  try {
    Invoke-RestMethod -Uri $Url -Method POST -ContentType 'application/json' -Body $body -ErrorAction Stop | ConvertTo-Json
    Write-Host "Posted $eventType"
  } catch {
    Write-Warning "Failed to post $eventType to $Url : $_"
  }
}

Write-Host "Sending sample tutorial events to $Url"

# tutorial_started
PostEvent 'tutorial_started' @{ playerId = $PlayerId; sessionId = $SessionId }
Start-Sleep -Milliseconds $DelayMs

# simulate a few steps with durations and completed events
for ($i = 0; $i -lt $Steps; $i++) {
  $stepId = "step_${i}"
  PostEvent 'tutorial_step_shown' @{ playerId = $PlayerId; sessionId = $SessionId; stepId = $stepId; index = $i }
  Start-Sleep -Milliseconds $DelayMs
  # send a step_duration (random 2-8s)
  $d = Get-Random -Minimum 2 -Maximum 9
  PostEvent 'tutorial_step_duration' @{ playerId = $PlayerId; sessionId = $SessionId; stepId = $stepId; durationSeconds = $d }
  Start-Sleep -Milliseconds $DelayMs
  PostEvent 'tutorial_step_completed' @{ playerId = $PlayerId; sessionId = $SessionId; stepId = $stepId; index = $i }
  Start-Sleep -Milliseconds $DelayMs
}

# send tutorial_completed with totals and per-step durations
$perStep = @{}
for ($i=0; $i -lt $Steps; $i++) { $perStep["step_${i}"] = (Get-Random -Minimum 2 -Maximum 9) }
$total = ($perStep.Values | Measure-Object -Sum).Sum
PostEvent 'tutorial_completed' @{ playerId = $PlayerId; sessionId = $SessionId; totalDurationSeconds = $total; stepDurations = $perStep }

Write-Host "Done sending sample tutorial events."
