title: Programming Well: Embrace Idempotence, Part 2 (It works at runtime too)
date: 2005-03-01
filename: ./tech/programming/idempotence/idempotence_2.txt


Idempotence has benefits at a program's run-time, as well as at build
time.  To illustrate, consider the case of a reference counted
string. For the sake of example, it might be declared like this (<i>In
case you're wondering, no, I don't think this is a production-ready
counted string library...</i>):


```c
struct CountedString					
{							
    int  _references;					
    char *_data;						
};             						
							
CountedString *makeString(char *data)			
{							
    CountedString cs = (CountedString *)malloc(sizeof(CountedString));	
							
    cs->_references = 1;					
    cs->_data = strdup(data);				
							
    return 1;						
}							
							
CountedString *referToString(CountedString *cs) 	
{							
    cs->_references++;					
    return cs;						
} 							 
							
void doneWithString(CountedString *cs) 			
{ 							
    cs->_references--; 					
							
    if (cs->_references == 0)				
    {
        free(cs->_data);					
        free(cs); 					
    } 							
}							
							
// ... useful library functions go here...
```

The reference counting mechanism buys you two things. It gives you the
ability to delete strings when they're no longer accessible; It also
gives you the abilty to avoid string copies by deferring them to the
last possible moment. This second benefit, known as <a
href="http://en.wikipedia.org/wiki/Copy-on-write">copy-on-write</a>,
is where idempotence can play a role. What copy on write entails is
ensuring that whenever you write to a resource, you ensure that you
have a copy unique to to yourself. If the copy you have isn't unique,
copy-on-write requires that you duplicate the resource and modify the
copy instead of the original. If you never modify the string, you
never make the copy.


This means that the beginning of every string function that alters a
string has to look something like this:

```c
CountedString *alterString(CountedString *cs) 		
{							
    if (cs->_references > 1)				
    {							
        CountedString *uniqueString = makeString(cs->_data);	
        doneWithString(cs);					
        cs = uniqueString;					
    }								
    
    \\ ... now, cs can be modified at will			
								
     return cs; 
}	
```

Apply a little refactoring, and you get this...

```c
CountedString *ensureUniqueInstance(CountedString *cs)		
{								
    if (cs->_references > 1)					
    {								
        CountedString *uniqueString = makeString(cs->_data);	
        doneWithString(cs);					
        cs = uniqueString;					
    }								
								
    return cs;
}

CountedString *alterString(CountedString *cs) 						
{											
    cs = ensureUniqueReference(cs);							
											
    \\ ... now, cs can be modified at will						
											
    return cs; 
}	
```

Of course, <code>ensureUniqueInstance</code> ends up being idempotent:
it gets you into a known state from an unknown state, and it doesn't
(semantically) matter if you call it too often. That's the key insight
into why idempotence can be useful.  Because idempotent processes
don't rely on foreknowledge of your system's state to work reliably,
they can be a predictable means to get into a known state. Also, If
you hide idempotent processes behind the appropriate abstractions,
they allow you to write code that's more self documenting. A function
that begins with a line like <code>cs =
ensureUniqueInstance(cs);</code> more clearly says to the reader that
it needs a unique instance of cs than lines of code that check the
reference count of cs and potentially duplicate it.

Next up are a few more examples of idempotence, as well as a look into
some of the pitfalls.
