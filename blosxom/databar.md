title: Excel 12 Databars, Now. (Sort of)
date: 2005-10-07
filename: ./tech/excel/databar.txt


Microsoft has just announced a cool new feature on the Excel 12 blog: the
databar. I think a picture (linked from Microsoft's 
<a href="http://blogs.msdn.com/excel/">Excel 12 Blog</a>) can explain it 
better than I can:

<br><br>

<center><img src="http://www.isamrad.com/dgainer/Two_10-04-2005_thumb.png"
     width="255"
     height="142"></center>

<br><br>

This will be a nice way to look for trends/outliers, but I can also
see it being useful for tracking parallel completion percentages
in status reports, etc. Of the Excel 12 features announced so far,
this is the one that I'm the most excited about. Of course, it's
also the one that's easiest to approximate in Excel <12. Andrew has
an approach using Autoshapes on 
<a href="http://blog.livedoor.jp/andrewe/archives/50066626.html#trackback">
his blog</a>, and I'm going to present a slightly different approach.

<br><br>

IMO, his approach looks a lot better, this approach has the benefit of
updating automatically. Pick your poison.

<br><br>

It all centers around this little UDF:

<pre>
Option Explicit

Function GraphBar(x As Double, _
                  Low As Double, _
                  High As Double, _
                  ScaleTo As Double) As String

    x = ((x - Low) / (High - Low)) * ScaleTo
    
    Dim i As Integer
    
    Dim blockFull As String
    Dim blockHalf As String
    
    blockFull = ChrW(9608)
    blockHalf = ChrW(9612)
    
    GraphBar = ""
    
    For i = 1 To Fix(x)
        GraphBar = GraphBar + blockFull
    Next
    
    If x - Fix(x) > 0.5 Then
        GraphBar = GraphBar + blockHalf
    End If
End Function
</pre>

This isn't rocket science: all it does is rescale x from the range 
<tt>[Low, High]</tt> to the range <tt>[0.0, ScaleTo]</tt>. Then, it 
strings together that many <tt>Chrw(9608)</tt>'s, followed by a 
<tt>Chrw(9612)</tt>, if the scaled value's fractional part is >0.5.  The 
trick in this is that <tt>Chrw(9608)</tt> and <tt>Chrw(9612)</tt> are VBA 
expressions that produce the the Unicode equivalent of the old line 
drawing characters IBM put in the original PC [1]. 9608 is a full box 
("&#9608;"), 9612 is a half box on the left ("&#9612;"). The result of 
this function ends up being a string that (when displayed as Arial) looks 
like a horizontal bar. ("&#9608;&#9608;&#9608;&#9608;&#9612;"). Put a few 
of those in adjacent cells, and you get this: 

<br><br>

<center>
<img src="http://www.mschaef.com/databar_1.gif" width="186" height="165">
</center>

<br><br>


The formulat in C2 (and filled down) is <tt>=GraphBar(B2,MIN(B$2:B$8),MAX(B$2:B$8),5)</tt>.
The <tt>MIN</tt> and <tt>MAX</tt> set the scale, the 5 sets the maximum length of
a bar. The maximum length, font size, column width can be tweaked to produce
a reasonably attractive result, although I do reccomend using vertical centering.

<br><br>

If you want to get a little fancier, conditional formatting works on
plot cells...

<br><br>

<center>
<img src="http://www.mschaef.com/databar_1_cf.gif" width="186" height="165">
</center>

<br><br>

...whitespace can possibly improve the appearance...

<br><br>

<center>
<img src="http://www.mschaef.com/databar_1_ws.gif" width="285" height="159">
</center>

<br><br>

...and this technique can scale.

<br><br>

<center>
<img src="http://www.mschaef.com/databar_1_periodic.gif" width="513" height="763">
</center>

<br><br>

1] <i>(The original PC didn't have stanard graphics, it was an option. If 
you bought the monochrome, non-graphics, video board, characters like this 
were as close as you could get to a bar chart.)</i>
