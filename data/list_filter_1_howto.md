title: List filtering with Formulas in Microsoft Excel: How it's done
date: 2005-07-28
filename: ./tech/excel/list_filter_1_howto.txt

Now that I've written a little about why you might want to <a
href="http://www.mschaef.com/cgi-bin/blosxom.cgi/2005/07/18#list_filter_0_motivation">
replace Excel AutoFilter</a>, here's how to actually do it. To frame
the discussion, there are two problems to solve:

* Deciding which rows of the input set are part of the result set
* Displaying the result set in a contiguous sequence of spreadsheet rows.

The first problem is easy: add another column alongside the input set
with a formula that evaluates to TRUE if the row belongs in the
result. This can be any valid Excel formula: it can include complex
logic, it can depend on other cells containing control parameters. In
my example spreadsheet, this formula is in column H, labeled <b>In
Query?</b>:

<img src="http://www.mschaef.com/list_filter_screenshot.gif" width="654" height="602">

The tricky bit of the formula-based filter is the second problem:
displaying the result set in a contiguous range of rows with no
gaps. Each cell that <i>might</i> display part of the result set has
to figure out itself what part of the result set to display, if any,
and pull the data from the input set. A simple MATCH or LOOKUP can't
handle this, since MATCH or LOOKUP can't be told to return the second,
third, or nth match. They return the first match, which isn't quite
enough for what we're trying to do.

As it turns out, even though having the result set compute a mapping from the
input set is quite hard, solving the reverse problem isn't too bad. Having
the input set compute the mapping to the result set is easy. Here's how it
works, by column:

* **Ord.** - The row ordinal number of the row in the input set,
    starting with 1.

* **Result Ord.** - This column starts at zero, in the row preceeding
   the first row of the result set, and increments by 1 for each row
   where <b>In Query?</b> is TRUE.  For each row with <b>In Query?</b>
   of TRUE, this column is the row ordinal number of this row in the
   result set.... We are almost there.

* **Result Rows.** - The input row ordinal of each row in the output
   set. This is done by using MATCH to find the first row for each
   number in the <b>Result Ord.</b>.

Once the <b>Result Rows.</b> column has been calculated, populating
the actual result set is just a matter of using INDEX. ISERROR can be
called on cells in <b>Result Rows.</b> to identify rows that don't
contain values. After all this is said and done, we have a spreadsheet
range that contains only a result set, updates like every other range
in Excel, and can be used in formulas like every other range.  I have
a sample spreadsheet that implements a lot of this <a
href="http://www.mschaef.com/list_filter.zip">here</a>.
