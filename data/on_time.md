title: MoveAfterReturn, OnTime, and the Excel Status Bar
date: 2005-09-20
filename: ./tech/excel/on_time.txt

I really liked
<a href="http://www.dicks-blog.com/archives/2005/09/19/move-after-selection/#comments">
This post</a> by Dick Kusleika, over on <a href="http://www.dicks-blog.com">Daily Dose
of Excel</a>. I'm a big fan of controlling frequently used options with keyboard
shortcuts. To riff on Mr. Kusleika's post a little, here's a refinement I've found
useful in the past for macros like these. Basically this allows the same macro
to toggle a state as well as non-destructively display the current state.

The first time the macro `MaybeToggleMAR` is invoked, it displays the
current state in the status bar, and sets a timer to expire in 3 seconds.
If the macro is invoked a second time before the timer expires (easy to do
if it's bound to a keystroke) the state is toggled. Technically speaking,
the trickiest bit is that the function that sets the 3 second timer also has
to handle cancelling any previous instance of the same timer. It works without
the timer cancellation, but without it, the UI behaves oddly after multiple
keypresses in rapid succession.

<a href="http://www.cpearson.com/excel.htm">Chip Pearson's website</a> has
useful content discussing the Excel API's for
<a href="http://www.cpearson.com/excel/ontime.htm">Timers and the 
<a href="http://www.cpearson.com/excel/StatusBar.htm">Status Bar</a>. 

Here's the code: to use it, stick it in a module and bind <tt>MaybeToggleMAR</tt>
to the keyboard shortcut of your choice.

```basic
Option Explicit
Private MARChangesEnabled As Boolean

Public NextDisableTime As Double

Sub DisableMARChanges()
    Application.StatusBar = False
    MARChangesEnabled = False
End Sub

Sub DisableMARChangesSoon()
    On Error Resume Next
    Application.OnTime NextDisableTime, "DisableMARChanges", , False
    
    NextDisableTime = Now + TimeSerial(0, 0, 3)
    Application.OnTime NextDisableTime, "DisableMARChanges", , True
End Sub


Sub MaybeToggleMAR()
    Dim NewStatusText As String
    
    NewStatusText = ""
    
    If MARChangesEnabled Then
        Application.MoveAfterReturn = Not Application.MoveAfterReturn
        NewStatusText = "Status changed: "
    Else
        MARChangesEnabled = True
        NewStatusText = "Second press will change status: "
    End If
            
    If Application.MoveAfterReturn Then
        NewStatusText = NewStatusText & "MoveAfterReturn Enabled"
    Else
        NewStatusText = NewStatusText & "MoveAfterReturn Disabled"
    End If
                
    Application.StatusBar = NewStatusText
    
    DisableMARChangesSoon
End Sub
```
