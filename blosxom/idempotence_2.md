title: Programming Well: Embrace Idempotence, Part 2 (It works at runtime too)
date: 2005-03-01
filename: ./tech/programming/idempotence/idempotence_2.txt



Idempotence has benefits at a program's run-time, as well as at 
build time.  To illustrate, consider the case of a reference
counted string. For the sake of example, it might be declared like
this (<i>In case you're wondering, no, I don't think this is a
production-ready counted string library...</i>):

<br><br>

<code>
struct CountedString					<br>
{							<br>
&nbsp;&nbsp;int  _references;					<br>
&nbsp;&nbsp;char *_data;						<br>
};             						<br>
							<br>
CountedString *makeString(char *data)			<br>
{							<br>
&nbsp;&nbsp;CountedString cs = (CountedString *)malloc(sizeof(CountedString));	<br>
							<br>
&nbsp;&nbsp;cs->_references = 1;					<br>
&nbsp;&nbsp;cs->_data = strdup(data);				<br>
							<br>
&nbsp;&nbsp;return 1;						<br>
}							<br>
							<br>
CountedString *referToString(CountedString *cs) 	<br>
{							<br>
&nbsp;&nbsp;cs->_references++;					<br>
&nbsp;&nbsp;return cs;						<br>
} 							<br> 
							<br>
void doneWithString(CountedString *cs) 			<br>
{ 							<br>
&nbsp;&nbsp;cs->_references--; 					<br>
							<br>
&nbsp;&nbsp;if (cs->_references == 0)				<br>
&nbsp;&nbsp;{<br>
&nbsp;&nbsp;&nbsp;&nbsp;free(cs->_data);					<br>
&nbsp;&nbsp;&nbsp;&nbsp;free(cs); 					<br>
&nbsp;&nbsp;} 							<br>
}							<br>
							<br>
// ... useful library functions go here...
</code>

<br><br>

The reference counting mechanism buys you two things. It gives you the ability to delete strings when they're no longer 
accessible; It also gives you the abilty to avoid string copies by deferring them to the last possible moment. This 
second benefit, known as <a href="http://en.wikipedia.org/wiki/Copy-on-write">copy-on-write</a>, is where idempotence 
can play a role. What copy on write entails is ensuring that whenever you write to a resource, you ensure that you have 
a copy unique to to yourself. If the copy you have isn't unique, copy-on-write requires that you duplicate the resource 
and modify the copy instead of the original. If you never modify the string, you never make the copy.

<br><br>

This means that the beginning of every string function that alters
a string has to look something like this:

<br><br>

<code>
CountedString *alterString(CountedString *cs) 		<br>
{							<br>
&nbsp;&nbsp;if (cs->_references > 1)				<br>
&nbsp;&nbsp;{							<br>
&nbsp;&nbsp;&nbsp;&nbsp;CountedString *uniqueString = makeString(cs->_data);	<br>
&nbsp;&nbsp;&nbsp;&nbsp;doneWithString(cs);					<br>
&nbsp;&nbsp;&nbsp;&nbsp;cs = uniqueString;					<br>
&nbsp;&nbsp;}								<br>
								<br>
&nbsp;&nbsp;
    \\ ... now, cs can be modified at will			<br>
								<br>
&nbsp;&nbsp; return cs; <br>
}	<br>
</code>

<br>

Apply a little refactoring, and you get this...

<br><br>

<code>
CountedString *ensureUniqueInstance(CountedString *cs)		<br>
{								<br>
&nbsp;&nbsp;if (cs->_references > 1)					<br>
&nbsp;&nbsp;{								<br>
&nbsp;&nbsp;&nbsp;&nbsp;CountedString *uniqueString = makeString(cs->_data);	<br>
&nbsp;&nbsp;&nbsp;&nbsp;doneWithString(cs);					<br>
&nbsp;&nbsp;&nbsp;&nbsp;cs = uniqueString;					<br>
&nbsp;&nbsp;}								<br>
								<br>
&nbsp;&nbsp;return cs;<br>
}<br>
<br>
CountedString *alterString(CountedString *cs) 						<br>
{											<br>
&nbsp;&nbsp;cs = ensureUniqueReference(cs);							<br>
											<br>
&nbsp;&nbsp;\\ ... now, cs can be modified at will						<br>
											<br>
&nbsp;&nbsp;return cs; <br>
}	<br>
</code>

<br><br>

Of course, <code>ensureUniqueInstance</code> ends up being idempotent: it gets you
into a known state from an unknown state, and it doesn't (semantically) matter if
you call it too often. That's the key insight into why idempotence can be useful.
Because idempotent processes don't rely on foreknowledge of your system's state to work reliably, 
they can be a predictable means to get into a known state. Also, If you hide
idempotent processes behind the appropriate abstractions, they  allow you to write
code that's more self documenting. A function that begins with a line like
<code>cs = ensureUniqueInstance(cs);</code> more clearly says to the reader that it
needs a unique instance of cs than lines of code that check the reference count of
cs and potentially duplicate it.

<br><Br>

Next up are a few more examples of idempotence, as well as a look into some of the pitfalls.