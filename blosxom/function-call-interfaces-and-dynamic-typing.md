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

<br><br>

To motivate this discussion, I'll use as an example a simple C
implementation of a string-interning function, <tt>intern_string</tt>.
If you're not familiar with the concept of interning, the premise is
that interning two objects ensures that if they have the same value,
they also have the same identity. In the case of C strings, interning
ensures that if <tt>strcmp(intern_string(a), intern_string(b)) ==
0</tt> holds true, then <tt>intern_string(a) == intern_string(b)</tt>
also holds true.  Since it effectively means that each string value is
only stored one time, this technique can reduce memory
requirements. It also gives you a cheap string equality comparison:
checking two interned strings for equality reduces to a pointer
comparison, which is about as fast as it gets.

<br><br>

Given a hash table that compares keys by value, implementing the
function <tt>string_intern</tt> is fairly simple. In the following
code code, <tt>intern_table</tt> is a hash table that maps strings to
themselves. <tt>hash_ref</tt>, <tt>hash_set</tt>, and
<tt>hash_has</tt> are functions that manipulate the hash table:

<br><br>
	
<list>
<li><tt>int hash_has(hash_table_t ht, char *key)</tt> - Returns <tt>TRUE</tt> or
    <tt>FALSE</tt>, depending on whether or not the key <tt>key</tt> is found
    in the hash table <tt>ht</tt>.

<li><tt>char *hash_ref(hash_table_t ht, char *key)</tt> - Returns the
    value bound to the key <tt>key</tt> by the hash table <tt>ht</tt>. 
    If the key is not found, behavior is undefined.

<li><tt>char *hash_set(hash_table_t ht, char *key, char *value)</tt> - 
    Binds the value <tt>value</tt> to the key <tt>key</tt> in the hash
    table <tt>ht</tt>. If the key is already present, the existing value
    is overwritten. This function returns <tt>value</tt>.    
</list>

<br>

Note the critical assumption that the <tt>hash_*</tt> accessors
implement key comparison by value sementics, <tt>strcmp</tt>, rather
than identity semantics, <tt>==</tt>.

<pre class="syntax">
   hash_table_t intern_table; // assume this is initialized somewhere else.

   char *intern_string(char *str) 
   {
     if (hash_has(intern_table, str))
        return hash_ref(intern_table, str);
    
     char *interned_str = strdup(str);
  
     hash_set(intern_table, interned_str, interned_str);

     return interned_str;
   }
</pre>


The first step of <tt>intern_string</tt> is to check to see if the
intern table already contains a string with the value of the new
string. If the new string is already in the intern table, then the
function returns the copy that's in the table.  Otherwise, a new copy
of the incoming string is created and stored in the hash table. In
either case, the string returned is in the the intern table.  This
logic ensures that every time <tt>intern_string</tt> is called with a
<tt>str</tt> of the same value, it returns the same exact string.

<br><br>
 
If you haven't guessed already, the problem with this implementation
of <tt>intern_string</tt> lies in the dual calls to <tt>hash_has</tt>
and <tt>hash_ref</tt>.  Both calls involve searching the hash table
for the key: <tt>hash_has</tt> to determine if the key exists, and
<tt>hash_ref</tt> to retrieve the key's value. This means that in the
common case, interning a string that's already been interned, this
implementaion searches the hash table twice. Double work.

<br><br>

Fixing this problem involves changing the calling conventions for
<tt>hash_ref</tt>. One of the simplest ways to do this involves
defining a specific return value that <tt>hash_ref</tt> can return in
the 'key not found' case. For strings in C, <tt>NULL</tt> is a logical
choice. This change to <tt>hash_ref</tt> makes it possible to remove
the double search by eliminating the explicit <tt>hash_has</tt> check:

<pre class="syntax">
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
</pre>

For this string interning, this change to <tt>hash_ref</tt> interface
works fairly well. We know that we'll never store a hash key with a
<tt>NULL</tt> value, so we know that <tt>NULL</tt> is safe to use for
signaling that a key was not found. Were this ever to change, this
version of <tt>hash_ref</tt> doesn't return enough information to
distinguish between the 'key not found' case and the '<tt>NULL</tt>
value' case. Both would return <tt>NULL</tt>.  To fix this,
<tt>hash_ref</tt> needs to be extended to also return a seperate value
that indicates if the key was found. This can be done in C by having
<tt>hash_ref</tt> return the 'key found' flag as a return value, and
also accept a pointer to a buffer that will contain the key's value,
if it's found:

<pre class="syntax">
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
</pre>

This is probably about as good as you can get in straight C.  It
easily distinguishes between the 'no-value' and 'no-key' cases, it's
relatively clear to read, and it uses the common idioms of the
language. However, C is a relatively sparse language. If you're
willing to switch to something a bit more expressive, you have other
choices.

<br><br>

One example of this is a choice that's particularly well supported by
dynamically typed languages.  With a language that can identify types
at runtime, it becomes possible for <tt>hash_ref</tt> to return values
of a different type if the key is not found. This value can be
distinguished from other return values by virtue of the run time type
identification supported by the language. In one such language,
Scheme, this lets us implement <tt>intern-string</tt> like this:

<pre class="syntax"> 
   (define *intern-table* (make-hash :equal))

   (define (intern-string str)
    (let ((interned-str (hash-ref *intern-table* str 42)))
     (cond ((= interned-str 42)
             (hash-set! *intern-table* str str)
              str)
           (#t
             interned-str)))))
</pre>

If you prefer C/JavaScript-style syntax, it looks like this:

<pre class="syntax"> 
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
</pre>


In this case, <tt>hash_ref</tt> has been extended with a third
argument: a default return value if the key is not found. The above
code uses this to have <tt>hash_ref</tt> return a number in 'no value'
case, and it's the type itself of this return value that ensures its
distinctness. This is a common dynamic language idiom, but for a
moment, consider what it would look like in C:

<pre class="syntax">
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
</pre>

At first, this actually seems like it might a plausible implementation
of <tt>intern_string</tt>. My guess is that it might even work most of
the time. Where this implementation gets into trouble is the case when
an interned string might reasonably be located at address 42. Because
C is statically typed, When <tt>hash_ref</tt> returns, all it returns
is a pointer. The caller cannot distinguish between the 'valid string
at address 42' return value and the 'no-key' return value.  This is
basically the same problem as the case where we overloaded <tt>NULL</tt>
to signal 'no-key'.

<br><br>

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