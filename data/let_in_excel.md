title: I had a dream...
date: 2005-08-24
filename: ./tech/excel/let_in_excel.txt


I literally dreamed about this last night. It would be
<b>wonderful</b> if Excel supported formulas like this:

```excel
=LET(value=MATCH(item,range,0), IF(ISERROR(value), 0, value))
```

If you're into Lisp-y languages, it'd look like this:

```scheme
(let ((value (match item range 0)))
  (if (is-error? value) 0 value))
```

The function call `=LET(name=binding, expression)` would create a
local range name named <i>name</i>, bound (equal) to the value
returned by <i>binding</i>, to be used during the evaluation of
<i>expression</i>. In the example above, during the evaluation of
`IF(ISERROR(value), 0, value))<`, `value` would
be bound to the value returned by `MATCH(item, range, 0)`.

It's worth pointing out that this is slightly different from how normal
Excel range names work. Range names in Excel work through textual
substitution. With textual substitution, the initial expression would
be logically equivalent to this:

```excel
=IF(ISERROR(MATCH(item, range, 0)), 0, MATCH(item, range, 0)))
```

In other words, Excel would treat every instance of <i>value</i> as if
<code>MATCH(item, range, 0)</code> was explictly spelled out. This
means there are two calls to MATCH and two potential searches through
the range. While it's possible that Excel <a
href="http://en.wikipedia.org/wiki/Memoization">optimizes the second
search away</a>, I'm not sure that anybody outside of Microsoft can
know for sure how this is handled.

Microsoft's <a href="http://support.microsoft.com/?kbid=280094">current</a>
reccomendation for handling the specific <code>ISERROR</code> scenario
in the first expression is this VBA function:

```basic
Function IfError(formula As Variant, show As String)

    On Error GoTo ErrorHandler

    If IsError(formula) Then
        IfError = show
    Else
        IfError = formula
    End If

    Exit Function

ErrorHandler:
    Resume Next

End Function
```

This isn't bad, but it requires that spreadsheet authors and
readers understand VBA. It also imposes significant performance
costs: calling into VBA from a worksheet takes time.
