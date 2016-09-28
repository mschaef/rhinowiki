title: "Apropos of..." Better Autofilter Results.
date: 2005-11-04
filename: ./tech/excel/apropos.txt

At my job, we use Excel extensively to keep track of software
testing progress. One typical use is to maintain a list of features
to be tested, along with their current pass/fail statuses and
an attempt at a rough subdivision into functional areas. Excel's
AutoFilter then makes it easy to ask questions like "show me all
failed tests relating to function block scheduling."

This works really well as long as "function block scheduling"
is one of the categories into which you've subdivided your
features list. If it's not, you have to get a little creative
to filter your list. One approach to this problem I've found
useful is filtering based on columns populated with a formula
similar to this:

```excel
=IF(ISERROR(SEARCH($K$5,K6)),"No","Yes")
```

If column K contains feature descriptions, this formula returns
"Yes" is the description matches the search string in K5 and "No",
otherwise. Filtering based on this formula makes it possible to
display every list item whose description matches a word. If there
is more than one column to search, you can use string concatenation
to aggregate the columns together:

```excel
=IF(ISERROR(SEARCH($K$5,K6&L6&M6)),"No","Yes")
```

So, why the name apropos? Follow this <a 
href="http://www.lisp.org/HyperSpec/Body/fun_aproposcm_apropos-list.html">link</a>.
