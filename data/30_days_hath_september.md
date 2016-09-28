title: Thirty days hath September...
date: 2005-11-09
filename: ./tech/excel/30_days_hath_september.txt

> Thirty days hath September,<br>
> the rest I can't remember.<br>
> The calendar hangs on the wall;<br>
> Why bother me with this at all?<br>
>
> &#8212; <http://leapyearday.com/30Days.htm>

Here's an Excel one liner that computes the number of days in
a particular month. Cell A2 contains the year of the month you're
looking for, Cell B2 contains the months' ordinal (1=January,
2=February, etc.):

```excel
=DAY(DATE(A2,B2+1,1)-1)
```

This is mainly useful to illustrate what can be done with Excel's
internal representation of dates. Dates and times in Windows versions
of Excel are normally stored as the number of days from January 1st, 1900. 
You can see this by entering a date in a cell, and then reformatting
the cell to display as a number rather than a date. For example, this
reveals April 1st, 2004 to be represented internally as the number 38078.
This is because there are 38,078 days between January 1st, 1900
and April 1st, 2004.

The formula above relies on this in its computation of the number of
days in a month. The sub-expression `DATE(A2,B2+1,1)` computes
the date number for the first day of the month immediately following
the month we're interested in.  We then subtract one from that number,
which gives us the date number for the last day of the month that we
are interested in. The call to DAY then returns the number of the day
within the month, which happens to be the number of days in the month.

