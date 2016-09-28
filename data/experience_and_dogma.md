title: Experience and Dogma
date: 2009-02-12
filename: ./tech/programming/experience_and_dogma.txt

In the recent debate surronding the <a
href="http://butunclebob.com/ArticleS.UncleBob.PrinciplesOfOod">SOLID
Principles</a> of Object Oriented Design, the following two quotes
stood out.

> Last week I was listening to a podcast on Hanselminutes, with Robert
> Martin talking about the SOLID principles. ... And, when I was
> listening to them, they all sounded to me like extremely bureaucratic
> programming that came from the mind of somebody that has not written a
> lot of code, frankly.<br>
> <br>
> &mdash; <a href="http://www.joelonsoftware.com/items/2009/01/31.html">Joel Spolsky</a></i>


> "Reading The Ferengi Programmer by Jeff Atwood really made me quite
> concerned. Here.s clearly an opinion which to me seems not grounded in
> sustained experience..." <br>
> <br>
> &mdash; <a href="http://blog.dhananjaynene.com/2009/02/an-experienced-programmer-doesnt-use-solid-as-a-checklist-he-internalises-it/">Dhananjay Nene</a></i>

Both of these are speculative slights on someone else's experience
level, either generally or with a particular bit of technology. Bad
rhetorical technique aside, my guess is that these are rooted in a
fundamental lack of trust that the other side might actually have a
well thought out reason for their point of view. This is an easy trap
to fall into, particularly in a field as subjective as software
design. Take the 'editor wars' as an example: which is better, Emacs,
vi, or a full featured IDE? I don't know the answer to this question,
but I do know that I can find people that will tell me I'm wrong for
prefering Emacs. Change the debate to something a bit more relevant,
something like the design of a large piece of software, and people get
even more vitriolic.

At least part of the solution to this problem is plain, old trust. 
Think about a good developer that's moved into a lead role: it's easy 
to see how they might care enough about a particular design point to 
impose that on their team, either by implementing it themselves or by 
dictate. Where the trust comes in is in avoiding that trap. If I 
impose a choice on my team, I limit their ability to explore the 
design space themselves, take their own risks, and then potentially 
fail.  I also limit their ability to correct my own misconceptions... 
if I think I'm right enough to mandate a design, I also probably 
think I'm right enough to ignore you and do my own thing anyway. 
Ironically enough, this makes the combination of conviction and risk 
aversion its own risk, and potentially a big one without a 
counterbalance.  (From a personal level, if you go around imposing 
your will and/or ignoring points of view, you also lose the 
opporunity to learn from those around you.)

And this is where the bit about rhetorical technique comes into play. 
As satisfying as it can be to say that somebody you disagree with 
<i>"...has not written a lot of code, frankly."</i>, it's really 
beside the point. It doesn't matter, even were it true. What matters 
more to reasonable discussions about engineering technique are 
specific and testable statements: something like "Interface 
Segregation will help keep defect rates by promoting better unit 
tests." You may or may not agree with this statement, but it's more 
likely to lead to a relevant conversation than slights on experience 
or dogmatic declarations of opinion as fact. Several years ago I was 
told in no uncertain terms that I had made a design choice that 
'wasn't scalable'. I ran some tests and came back with some numbers 
that showed my choice satisfied our requirements. Who do you think 
won that debate, the buzzword or the numbers? Specifics and 
testability can count for a lot. Dogma, not so much.

To be fair, most of the two blog posts I mention above are focused on 
meatier material than my quotes imply. I particularly liked Atwood's 
conclusion that <i>"Rules, guidelines, and principles are gems of 
distilled experience that should be studied and respected. But 
they're never a substute [sic] for thinking critically about your 
work."</i> For experienced developers, I expect that Nene would also 
agree. After all, he writes that <i>"you have the experience on your 
side to generally make the right judgement calls and you are likely 
to anyway apply them under most of the cases."</i> In a sense, both 
are arguing the same thing, namely that judgement ultimately drives 
the design process over strict adherence to a set of rules. The 
difference is that Nene takes it a few steps further and draws the 
conclusion that good developers produce good code, good code is 
SOLID, and Atwood's blog post is either useless or harmful. Maybe 
there are some valid points here, but they're obscured by a dogmatism 
that is more of a distraction than a productive way to think about 
software design.
