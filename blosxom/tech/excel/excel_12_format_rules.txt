title: Excel 12's Conditional Formatting Rules
date: 2005-10-11
filename: ./tech/excel/excel_12_format_rules.txt


David Gainer has <a href="http://blogs.msdn.com/excel/archive/2005/10/11/479713.aspx">Summarized
a a number of new conditional formatting rules in Excel 12</a>, over on the Excel 12 blog. These
rules were designed to <i>"make a greater number of scenarios possible without needing to write
formulas."</i> In other words, all these scenarios have simple solutions directly visible in
the Excel 12 UI.

<br><br>

Well, if you can't wait for Excel 12, Excel is pretty darned powerful as it is, and as Mr. Gainer
states: most of these scenarios have formula-based approaches that work right now. Here are
some of the approaches for current versions of Excel:


<ul>
<li>With data bars, color scales, or icons based on the numeric value in the cell, percentages,
    percentiles, or a formula. See the posts on data bars, color  scales, and icon sets for more
    information on each of these. - <b><a href="http://www.mschaef.com/cgi-bin/my_blosxom.cgi/tech/excel/databar.txt">
    This approach to 'databars'</a> generalizes to formula-based scaling, although it's not as
    pretty, not a color scale, and not an icon set. </b>

<li>Containing, not containing, beginning with, or ending with specific text.  For example, highlighting
    parts containing certain characters in a parts catalog. - <b>Use a formula: a lot of these
    conditions can be tested using <tt>FIND</tt>: <tt>=FIND(<i>string</i>, A1)=1</tt>, checks
    for parts that begin with <i>string</i>, for example.</b>

<li>Containing dates that match dynamic conditions like yesterday, today, tomorrow, in the last
    7 days, last week, this week, next week, last month, this month,  next month.  For example, highlight
    all items dated yesterday.  The great part about these conditions is that Excel handles calculating
    the date based on the  system clock, so the user doesn.t need to worry about updating the condition. -
    <b>Use a formula: the system date is available via <tt>NOW()</tt>, and Excel offers plenty
    of date arithmetic functions to check for specific conditions.</b>

<li>That are blank or that are non-blank. - <b>Use a formula: <tt>=ISBLANK(A1)</tt>
    or <tt>=NOT(ISBLANK(A1))</tt></b>

<li>That have errors or that do not have errors. - <b>Use a formula: <tt>=ISERROR(A1)</tt>
    or <tt>=NOT(ISERROR(A1))</tt></b>

<li>That are in the top n of a selected range (where n is whatever number you want) OR that are in the
    top n percent of a selected range (again, where n is  adjustable). For example, highlighting the
    top 10 investment returns in a table of 1,000 investments. - <b>Use a formula:
    <tt>=RANK(A1, <i>range</i>)&gt;<i>n</i></tt>.</b>

<li>Cells that have the bottom n values OR cells that are the bottom n percent of a selected range. -
    <b>Use a formula: <tt>=RANK(A1, <i>range</i>)&lt;ROWS(<i>range</i>)-<i>n</i></tt>.</b>

<li>Cells that are above average, below average, equal to or above average, equal to or below average,
    1 standard deviation above, 1 standard deviation below, 2  standard deviations above, 2 standard
    deviations below, 3 standard deviations above, 3 standard deviations below a selected range. - <b>
    This type of thing can be solved using a particular form of formula:
    <tt>=A1&lt;(AVERAGE(<i>range</i>)-<i>n</i>*STDEV(<i>range</i>))</tt> or
    <tt>=A1&gt;(AVERAGE(<i>range</i>)+<i>n</i>*STDEV(<i>range</i>))</tt>. For large ranges, it probably
    makes sense to move the computation of AVERAGE and STDEV into a cell, and have the conditional
    format reference (with an absolute reference) that cell.</b>

<li>Cells that are duplicate values or, conversely, cells that are unique values. - <b>Use
    a formula: <tt>=COUNTIF(<i>range</i>, A1)=1</tt> or <tt>=COUNTIF(<i>range</i>, A1)&gt;1</tt>.
    Ensure that the range you use in the formula has an absolute address. If your range is sorted
    on the 'key' field, you can use this style of formula: <tt>=A1&lt;&gt;A2</tt>. This can be much,
    much faster, particularly for large tables. (<i>For the Comp. Sci. types it's O(N), rather
    than O(N^2), once you have sorted data.</i>)</b>

<li>Based on comparisons between two columns in tables.  For example, highlight values where values
    in the .Actual Sales. column are less than in the .Sales  Target. column. - <b>Use a conditional
    format formula: <tt>=A1&lt;B1</tt>. Apply it to the entire column you want shaded, and Excel will
    evaluate the seperately for each cell.  The cell references in the format formula
    are relative to the current cell in the selected range. The current cell is the cell in
    the range that is <b>not</b> highlighted (but is surrounded by a selection border), and can be
    moved around the four corners of the range with Control+. (period).</b>

<li>When working with tables, we have also made it easy to format the entire row based on the results
    of a condition. - <b>Relative formulas can be made to do this: select an entire range, and define
    a conditional formula using absolute column addresses (ie: <tt>=$a1</tt>). Excel evaluates the format
    formula for each cell in the range, and since the column addresses are absolute, each cell in a row
    will pull from the came columns. Therefore, each cell in a row will share the same conditional
    format, which is what we want.</b>

</ul>


Based on this, you don't have to wait for Excel 12 to get a lot of these features, you just have
to wait for Excel 12 if you want Excel to do it for you automatically. My suggestion would be to
learn how to use conditional formatting formulas, but I tend to be  <i>"here's how to fish"</i>
kind of guy more than a <i>"here's a fish"</i> kind of guy.
