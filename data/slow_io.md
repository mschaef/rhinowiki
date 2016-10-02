title: I guess I had forgotten how slow I/O was, particularly bad I/O.
date: 2005-03-02
filename: ./tech/lisp/slow_io.txt

I'm in the middle of developing a Scheme compiler for a future release of
vCalc. While I've been developing the code, I've peppered it full of debugging
print statements that look something like this: 

```scheme
(format #t "compiling ~l, tail?=~l, value?=~l" form tail? value?)
```

with the output statements in place, the compiler takes about 250-300ms to
compile relatively small functions. Not great, particularly considering
that there's no optimization being done at all. Anyway, on a hunch I removed
the format statements, and execution time improved by a <b>couple orders of
magnitude</b> to a millisecond or two per function. That's a lot closer to what
I was hoping for at this stage of development.

On the other hand, I hadn't realized that my (ad hoc, slapped together in
an hour) format function was running quite that slowly. I think it'll end
up being an interesting optimnization problem sooner or later.

