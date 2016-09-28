title: Formulas Driven from AutoFilters
date: 2005-10-03
filename: ./tech/excel/list_filter_2_reverse.txt


<b>I had this written out and then discovered a better way. SUBTOTAL
is "sensitive to AutoFilter settings", right? Assuming A1 isn't empty,
this formula `=subtotal(a1, 2)=1` returns TRUE if row 1 is visible and
FALSE otherwise. No VBA necessary.</b>


Not too long ago, I made a <a
href="http://www.mschaef.com/cgi-bin/blosxom.cgi/tech/excel/list_filter_1_howto.txt">post</a>
that describes how to replicate some of the behavior of Excel
Autofilters using a purely formula based approach. One of the
arguments I put forward in support of that technique is that it makes
it possible to use filtered result sets to drive other
calculations. However, the approach also has two disadvantages: it's
slow to compute and can be a little tricky to setup and understand. As
a sort of intermediate ground between using the AutoFilter and
re-implementing it, this post describes how an Excel formula can
determine if a row is a member of an AutoFilter result set. The magic
bit is this little user defined function:

```basic
Function IsVisible(rng As Range) As Boolean
    IsVisible = True
    
    Dim row As Range
    Dim col As Range
           
    For Each row In rng.Rows
        If row.RowHeight = 0 Then
            IsVisible = False
            Exit Function
        End If
    Next
        
    For Each col In rng.Columns
        If col.ColumnWidth = 0 Then
            IsVisible = False
            Exit Function
        End If
    Next
End Function
```

Given a range, this function returns true if every cell in the range
is visible (non-zero row height and column width). The way Excel
works, the Row Height of a row hidden by the Autofilter is reported as
zero. Therefore, IsVisible returns false when given a reference to a
cell in a hidden AutoFiltered row. Of course, it also returns False
for cells in manually hidden rows and columns, but if you're careful,
you can avoid that.

For a simple use case, this function can be used to generate alternating
color bars that always alternate regardless of the AutoFilter settings.
To set it up, Put TRUE in the topmost cell of a free column next to the
AutoFilter to be colored. Below the TRUE, fill down with a formula like
this: <tt>=IF(isvisible(D2),NOT(D1),D1)</tt>. This formula inverts the
value in the column, but only for cells that are visible. This guarantees
that regardless of the AutoFilter settings, this column will always
alternate TRUE/FALSE in the set of visible rows. This column can then
be used to drive a conditional format that highlights alternating visible
rows.

A couple sidenotes:

* This function works because adjusting an AutoFilter triggers recalculation,
  and Excel notices that this function depends on row heights. For hiding
  columns, it's a lot less reliable. All the calls to IsVisible have to
  be forced to recompute after the column is hidden or displayed. To do this,
  IsVisible can be <a href="http://www.dicks-blog.com/archives/2004/06/22/volatile-functions/">
  marked as volatile</a> and recalculation forced by pressing F9. This is a
  lousy solution.

* To optimize performance, the function short-circuits its search. The <tt>Exit
  Function</tt>'s bail out of the calculation as soon as the first hidden
  row or column is discovered.

* Excel's SUBTOTAL intrinsic function is also sensitive to AutoFilter settings.
