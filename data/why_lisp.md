title: Why Lisp?
date: 2009-04-16
filename: ./tech/lisp/why_lisp.txt

I recently was asked why I like Lisp. For me, it boils down to
the fact that Lisp makes it easy to control when your code is
evaluated. Most languages only let you evaluate code at
runtime. There are ways around this (C++ templates, <tt>cpp</tt>,
code generation, etc.), but they all have severe limitations. In
contrast, Lisp makes it easy to run actual Lisp code at compile
time (macros) or even read time (reader macros). Combine that
with the fact that Lisp code is pretty easy to manipulate with
Lisp itself, and it becomes much easier to do things that are
usually restricted to language developers, which can be quite a
force multiplier. Just to illustrate, most of the language
features that C# has over Java (LINQ, properties, closures,
lambda syntax, <tt>yield return</tt> etc.) could be added to Java
by 'ordinary developers' if Java somehow had these things I like
so much about Lisp.

*But it doesn't...*


