title: Mapping XML to S-Expressions
date: 2005-06-30
filename: ./tech/lisp/xml_to_s_exprs.txt

I've been playing around with how to map XML to S-Expressions nFor a
while, I had been considering a mapping like the following:

<table border="0" cellspacing="2">
<tr><td><b>From:</b></td><td><tt>&lt;phone_book name="Jenny"&gt;867-5309&lt;/phone_book&gt;</tt></td></tr>
<tr><td><b>To:</b></td><td><tt>(phone_book ((name . "Jenny")) "867-5309")</tt></td></tr>
</table>

In other words, a symbol for the tag name in the car of the list,
an association list of attribute values in the cadr, and then the
subelements in the cddr. This seems reasonable, aside from the fact
that attributes and tag values are still wierdly disjoint.

On the way to lunch today, I came up with another mapping that might
be more reasonable:

<table border="0" cellspacing="2">
<tr><td><b>From:</b></td><td><tt>&lt;phone_book name="Jenny"&gt;867-5309&lt;/phone_book&gt;</tt></td></tr>
<tr><td><b>To:</b></td><td><tt>(phone_book (name "Jenny") :end-of-attribute-marker "867-5309")</tt></td></tr>
</table>

This is simpler in that a tag is modeled as a list containing 
the tag symbol and then all of the sub-items, attributes or not. Data
stored as an attribute doesn't get special treatment relative to 
data stored as a tag value. The symbol <tt>:end-of-attribute-marker</tt> makes
it possible to still distinguish between attributes and tags. If you
don't care, a simple call to <tt>remove</tt> can remove the marker symbol.

It's a subtle design point, but this'll probably end up in vCalc in the XML 
support... I've had XML for vCalc on the back-burner for a while now, but
due to some real work obligations, I might have to make it a higher
priority.
