title: "Saving Excursions" in Excel
date: 2005-06-02
filename: ./tech/excel/save_excursion.txt


Lately, I've been finding myself spending lots of time toggling between
two Excel spreadsheets to make edits. This little macro makes it easy in
Excel 2000 to toggle between two spreadsheet windows.  I reccomend
you bind it to a keystroke.

<pre>
Option Explicit

Dim lastWindow As Variant

Sub HereAndThere()
    If IsEmpty(lastWindow) Then
        Set lastWindow = ActiveWindow
    Else
        Dim currentWindow As Window
        Set currentWindow = ActiveWindow
        
        lastWindow.Activate
        
        Set lastWindow = currentWindow
    End If
End Sub
</pre>

Here's how you use it:

<ul>
<li>Run the macro once to save your current location.
<li>Switch to your other spreadsheet
<li>Now, running the macro will switch back and forth betweeen the two worksheets.
</ul>

The "saving excursions" in the title is a reference to the
<a href="http://www.gnu.org/software/emacs/elisp-manual/html_node/elisp_482.html">save-excursion special
form</a> in Emacs Lisp. This macro isn't quite the same (and not nearly as powerful), but it
reminded me of the Emacs feature.  If it turns out to be useful, I might generalize my
little macro to include some of the capabilities of Emacs' save-excursion.
