title: Excel 12 Databars, Without VBA.
date: 2005-10-07
filename: ./tech/excel/databar_2.txt

I suspected as much, but Excel has a way to duplicate my UDF using
Excel formulas.

```excel
=REPT("&#9608;",A1) & REPT("&#9612;",ROUND(FLOOR(A1,1),0))
```

That formula evaluates to a bar of length A1 units, rounded to the
nearest 0.5. Rescaling can be done in another cell. If you're
interested in a bar that can be right-justified, you can use this:

```excel
=REPT("&#9616;",ROUND(A1-FLOOR(A1,1),0)) & REPT("&#9608;",A1)
```

The trickiest part about this is getting the block characters into the
formula. For that, I reccomend using the Windows Character Map.

Qualitatively compared to VBA, this method requires more logic to be
represented in the spreadsheet: that adds compelxity for readers and
makes it tricker to set up than the VBA. On the other hand, it avoids
the performance hit of calling UDF and the requirement that the
spreadsheet contain a macro. I honestly don't know which is better
style, but can say that this would be a perfect time to use a
paramaterized range name (if Excel had such a thing).
