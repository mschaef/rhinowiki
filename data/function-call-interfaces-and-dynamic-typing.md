title: Function Call Interfaces and Dynamic Typing
date: 2008-01-08
filename: ./tech/programming/function-call-interfaces-and-dynamic-typing.txt


Lately, I've been thinking a bit about the way language design
influences library design. My line of thought started out inspired by
some of the recent conversations about closures in Java, but it ended
up also touching on dynamic typing and a few other 'modern' language
features.  This will end up being more than one post, but I thought
I'd record some of it in my blog, with the hope that it might shed
some light for somebody, somewhere.

To motivate this discussion, I'll use as an example a simple C
implementation of a string-interning function, `intern_string`.
If you're not familiar with the concept of interning, the premise is
that interning two objects ensures that if they have the same value,
they also have the same identity. In the case of C strings, interning
ensures that if `strcmp(intern_string(a), intern_string(b)) ==
0` holds true, then `intern_string(a) == intern_string(b)`
also holds true.  Since it effectively means that each string value is
only stored one time, this technique can reduce memory
requirements. It also gives you a cheap string equality comparison:
checking two interned strings for equality reduces to a pointer
comparison, which is about as fast as it gets.

Given a hash table that compares keys by value, implementing the
function `string_intern` is fairly simple. In the following
code code, `intern_table` is a hash table that maps strings to
themselves. `hash_ref`, `hash_set`, and
`hash_has` are functions that manipulate the hash table:
	
* `int hash_has(hash_table_t ht, char *key)` - Returns `TRUE` or `FALSE`, depending on whether or not the key `key` is found in the hash table `ht`.
* `char *hash_ref(hash_table_t ht, char *key)` - Returns the value bound to the key `key` by the hash table `ht`. If the key is not found, behavior is undefined.
* `char *hash_set(hash_table_t ht, char *key, char *value)` - Binds the value `value` to the key `key` in the hash table `ht`. If the key is already present, the existing value is overwritten. This function returns `value`.

Note the critical assumption that the `hash_*` accessors
implement key comparison by value sementics, `strcmp`, rather
than identity semantics, `==`.

```c
hash_table_t intern_table; // assume this is initialized somewhere else.

char *intern_string(char *str) 
{
  if (hash_has(intern_table, str))
     return hash_ref(intern_table, str);

  char *interned_str = strdup(str);

  hash_set(intern_table, interned_str, interned_str);

  return interned_str;
}

```

The first step of `intern_string` is to check to see if the
intern table already contains a string with the value of the new
string. If the new string is already in the intern table, then the
function returns the copy that's in the table.  Otherwise, a new copy
of the incoming string is created and stored in the hash table. In
either case, the string returned is in the the intern table.  This
logic ensures that every time `intern_string` is called with a
`str` of the same value, it returns the same exact string.
 
If you haven't guessed already, the problem with this implementation
of `intern_string` lies in the dual calls to `hash_has`
and `hash_ref`.  Both calls involve searching the hash table
for the key: `hash_has` to determine if the key exists, and
`hash_ref` to retrieve the key's value. This means that in the
common case, interning a string that's already been interned, this
implementaion searches the hash table twice. Double work.

Fixing this problem involves changing the calling conventions for
`hash_ref`. One of the simplest ways to do this involves
defining a specific return value that `hash_ref` can return in
the 'key not found' case. For strings in C, `NULL` is a logical
choice. This change to `hash_ref` makes it possible to remove
the double search by eliminating the explicit `hash_has` check:

```c
hash_table_t intern_table;

char *intern_string(char *str) 
{
  char *interned_str = hash_ref(intern_table, str);

  if (interned_str == NULL) 
  {   
     interned_str = strdup(str);

     hash_set(intern_table, interned_str, interned_str);
  }

  return interned_str;
}
```

For this string interning, this change to `hash_ref` interface
works fairly well. We know that we'll never store a hash key with a
`NULL` value, so we know that `NULL` is safe to use for
signaling that a key was not found. Were this ever to change, this
version of `hash_ref` doesn't return enough information to
distinguish between the 'key not found' case and the '`NULL`
value' case. Both would return `NULL`.  To fix this,
`hash_ref` needs to be extended to also return a seperate value
that indicates if the key was found. This can be done in C by having
`hash_ref` return the 'key found' flag as a return value, and
also accept a pointer to a buffer that will contain the key's value,
if it's found:

```c
hash_table_t intern_table;

char *intern_string(char *str) 
{
  char *interned_str;  

  if (!hash_ref(intern_table, str, &interned_str))
  {   
     interned_str = strdup(str);

     hash_set(intern_table, interned_str, interned_str);
  }

  return interned_str;
}
```

This is probably about as good as you can get in straight C.  It
easily distinguishes between the 'no-value' and 'no-key' cases, it's
relatively clear to read, and it uses the common idioms of the
language. However, C is a relatively sparse language. If you're
willing to switch to something a bit more expressive, you have other
choices.

One example of this is a choice that's particularly well supported by
dynamically typed languages.  With a language that can identify types
at runtime, it becomes possible for `hash_ref` to return values
of a different type if the key is not found. This value can be
distinguished from other return values by virtue of the run time type
identification supported by the language. In one such language,
Scheme, this lets us implement `intern-string` like this:

```scheme
(define *intern-table* (make-hash :equal))

(define (intern-string str)
 (let ((interned-str (hash-ref *intern-table* str 42)))
  (cond ((= interned-str 42)
          (hash-set! *intern-table* str str)
           str)
        (#t
          interned-str)))))
```

If you prefer C/JavaScript-style syntax, it looks like this:

```javascript
var intern_table = make_hash(EQUAL);

function intern_string(str)

{
   var interned_str = hash_ref(intern_table, str, 42);

   if (interned_str == 42)
   {
       hash_set(intern_table, str, str);
       return str;
   }

   return interned_str;
}

```

In this case, `hash_ref` has been extended with a third
argument: a default return value if the key is not found. The above
code uses this to have `hash_ref` return a number in 'no value'
case, and it's the type itself of this return value that ensures its
distinctness. This is a common dynamic language idiom, but for a
moment, consider what it would look like in C:

```c
hash_table_t intern_table;

char *intern_string(char *str) 
{
  char *interned_str = hash_ref(intern_table, str, (char *)42);

  if (interned_str == (char *)42) 
  {   
     interned_str = strdup(str);

     hash_set(intern_table, interned_str, interned_str);
  }

  return interned_str;
}
```

At first, this actually seems like it might a plausible implementation
of `intern_string`. My guess is that it might even work most of
the time. Where this implementation gets into trouble is the case when
an interned string might reasonably be located at address 42. Because
C is statically typed, When `hash_ref` returns, all it returns
is a pointer. The caller cannot distinguish between the 'valid string
at address 42' return value and the 'no-key' return value.  This is
basically the same problem as the case where we overloaded `NULL`
to signal 'no-key'.

The way the dynamically typed language solved this problem is worth
considering. When a dynamically typed language passes a value, what 
it's really doing is  returning a pointer <i>along with a few extra
bits describing the type of the object</i> being pointed to. (Runtime
implementations might vary, but that's the gist of many.)  Using
dynamic typing to distinguish between those two possible cases really
amounts to using those few extra type bits to contain 'another' return
value, one holding information on whether or not the key was found.
<i>This is exactly what our 'best' C implementation does explicitly with
a return value and a reference value.</i> The dynamic typing isn't
necessarily adding any expressive power, but it is giving another,
concise means of expressing what we're trying to say.
