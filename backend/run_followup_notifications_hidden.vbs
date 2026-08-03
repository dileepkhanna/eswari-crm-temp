' VBScript to run batch file hidden (no CMD window)
' This prevents the CMD window from popping up

Set objShell = CreateObject("WScript.Shell")

' Get the directory where this VBS file is located
strScriptPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Run the batch file with window style = 0 (hidden)
objShell.Run """" & strScriptPath & "\run_followup_notifications.bat""", 0, True

Set objShell = Nothing
