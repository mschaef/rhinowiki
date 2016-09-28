title: Macros and Inline Functions
date: 2006-03-20
filename: ./tech/general/inline.txt

I recently converted a bunch of accessor macros in vCalc over to
inline functions. These macros are a legacy of vCalc's <a
href="http://people.delphiforums.com/gjc/winsiod.html"> siod</a>
heritage, and generally looked something like this:

```c
#define FLONM(x) ((*x).storage_as.flonum.data)
```

In this macro, `x` is expected to be a pointer to an LObject,
which is basically a struct consisting of union, `storage_as`,
and a type field that specifies how to interpret the union. vCalc has
a set of these macros to refer to fields in each possible
interpretation of the `storage_as` union. These little jewels
remove a lot of reduntant `storage_as`'s from the code, and
generally make the code much easier to work with.  However, like all
C/C++ macros, these macros have finicky syntax, bypass typechecking,
and have limited ability to be extended to do other things (like
verifying type fields, etc.).  Fortunantly, they are a perfect
candidate to be replaced by C++ inline functions and references:

```c
inline flonum_t &FLONM(LRef x) 
{
   return ((*x).storage_as.flonum.data);
}
```

Even better, with function inlining turned on, there's no apparant performance penalty
in making this transformation; even with inlining off, the penalty seems pretty modest
at 20-20%. In other words, inline functions works exactly as advertised.  It works well
enough, if fact, that I made the 'logical extension', and added some type checking logic.

```c
inline flonum_t &FLONM(LRef x)
{
   assert(FLONUMP(x));
   return ((*x).storage_as.flonum.data);
}
```

This version of the code verifies that `x` is actually a flonum
before trying to interpret it as such. Normally, the code using these
accessor functions explicitly checks the type of an object before
making a reference, but sometimes, due to coding errors, invalid
references can slip through the cracks. With the old style macros,
these invalid references could result in data corruption with no
warning.  With checks, there's at least an attempt to check for bad
references before they are made.

Adding these checks proved profitable: they revealed three logic
errors in about 5 minutes of testing, two related to reading complex
numbers, and one related to macroexpansion of a specific class of
form. Adding these type checks also killed performance, but that was
pretty easy to solve by making the additional checks independently
switchable.
