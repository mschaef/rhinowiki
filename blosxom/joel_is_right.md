title: Joel is Right
date: 2005-02-16
filename: ./tech/general/joel_is_right.txt


Jon Galloway <a href="http://weblogs.asp.net/jgalloway/archive/2005/02/16/374212.aspx">recently
posted</a> a set of six counterarguments to Joel Spolsky's assertation that 
<a href="http://www.joelonsoftware.com/articles/CollegeAdvice.html">Computer Science college
students should not learn C</a>. I take issue with all six of Jon's arguments, but my
core arguments boil down to these two points: 
<br><br>
<list>
<li>An understanding of C, and the issues it raises, is essential to programming well in higher level environments.
<li>Interesting and useful work is still being done in C.
</list><br><br>
Now, speaking to Jon's particular issues
<p><p>

<p><b>1. It's not a skill you'll use in most of the software development jobs you'd want to have</b><br>
<br>

	<i>...here are the kind of things you might use C for these days - writing some kind of device
	driver, maintaining extremely old applications, embeded development on very limited hardware,
	or maybe writing an operating system or compiler or something. I guess you could like hack
	away on the Linux (or is that GNU-Linux) kernel....</i><br><br>

	Having done this work for seven years (and enough of IT-style work to know the difference), this
	is some of the most interesting stuff you can do with a computer science education. In C, I've
	developed two programming languages, an object oriented framework for distributed real-time
	process control applications, a bunch of objects using that framework, and yes, my share of
	device drivers and RTOS extensions. It's been interesing and deep technical work, despite
	the fact that is was wrapped in a plain, C wrapper.<br><br>


	<i>"...Consider this though - you're not really going to be solving any new problems...."</i><br><br>

	Not much commercial software work involves solving truly new technical problemss.  If you really
	want that, pick a problem to solve, get your Ph.D. and enter a research environment. <br><br>

	Otherwise, there are still plenty of interesting systems to build and lots of deep thinking
	to do in commercial software development, Some of those jobs <b>require</b> C. Even
	more of those jobs require a mastery of the skills that C requires you to have and develop.<br><br>


	<i>"...If you want to do web development, database development, desktop applications - you know,
	stuff you can talk about at a party - you're probably not going to be working in C....</i><br><br>

	This is a wierd argument... I'm not sure why this is stuff that's more suitable for small talk
	at a party than any other programming work.  All of it seems equally bad, actually. In any event,
	do you really want to choose your career (>=40 hours a week for years) based on what plays well
	at a party?
</p>

<p><b>2. It can give you a false sense of control </b><br><br>

	<i>"...Worse still is that it can make you think that programming is about telling the
	computer what to do with its registers and memory. ..."</i><br><br>

	At it's core, that is exactly what programming is about: telling a computer how to accomplish
        useful tasks in a language/vocabulary it can understand (i.e. bits/bytes, registers, memory, etc.).
        It's nice to build abstractions
        atop that so we don't have to think about moving bytes around, but if those abstractions
	ever leak, you will <b>have</b> to know why to effectively deliver software.<br><br>
</p>

<p><b>3. It can teach you to get in the way </b><br><br>
	<i>"... If all you learned from C is that you are the boss, you will most certainly write code that
	plays poorly with others..."</i><br><br>

	This is probably true, particularly if you treat other languages like they were C.<br><br>

	The power of learning C is that it forces you to take control. To programm effectively in C, you
	<b>have</b> to understand how higher level constructs like strings, objects, processes, etc. map
	down to the basic concepts supported You <b>have</b> to explicitly think about every memory
	allocation, where the storage is allocated, and whem the memory gets freed. You <b>have</b> to
	think about when values are passed by reference, and by value. Compared to Java and C#, you
	<b>have</b> to think about a lot of things that, in the modern world, seem like low-level trivia.<br><br>

	This is the whole point.  Even if you never touch C again, the language you do end up using has
	to solve exactly these problems. And it likely does it, via some mechanism like garbage
	collection, that imposes its own costs and constraints.  If you don't understand these
	low-level mechanisms, and the constraints they impose, you can't be considered a fluent programmer
	in whatever language you use. This is true for the same reason that, when I went to school, around
	1994, I had to learn Motorola 68000 assembler code.  I've never written 68K assembler commercially,
	but that coursework made it <b>crystal clear</b> what various high level language constructions
	cost.
</p>

<p><b>4. It can make it hard for you to love famework based development </b><br><br>

	<i>"...To be productive as a programmer these days, you either need to be learning to get the most 
	out of existing frameworks or helping to build tomorrow's frameworks. ..."</i><br><br>

	It's possible to build frameworks in C, as well as to use them.  One of Jon's framework
	examples, <a href="http://www.gtk.org">Gtk</a>, is written in C. <a href="http://www.gimp.org">The Gimp</a>
	is an example of an application that is written in C, and based on GTK. There are plenty of other
	examples of C-based framework development.
</p>

<p><b>5. It can teach you philosophies which will prevent you from really understanding modern programming </b><br><br>

	It teaches the philosophies on which modern programming is built. BAsically all modern OS's are built in C,
	at the core. Basically all commercial run-time environments are built in C, at the core.  Lower-level still,
	modern CPU's and ISA's evolved in a time when C was king, and are well suited to running compiled C code.<br><br>

</p>

<p><b>6. It can teach you divert your problems from the real challenges of software engineering </b><br><br>

	<i>"...The point is, today's software development environment is dynamic, evolving, and extremely
	challenging. If you're going to be of help, you need to do something more productive with your
	time than learn a 20 year old language..."</i><br><br>


	If you're going to be of help, you can do things more productive with your time than encouraging
	people <b>not</b> to learn about the core aspects of their profession.<br><br>

	I'll be the first to admit that you can get away with never programming professionally in C, but
	your programming will ultimately suffer for not knowing it.	
</p>

