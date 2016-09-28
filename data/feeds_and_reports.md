title: Feeds and Reports
date: 2005-12-14
filename: ./tech/programming/feeds_and_reports.txt

I've been doing a lot of analysis of feeds and reports lately, and
have come up with a couple suggestions for file design that can make
feeds easier to work with. None of this should be earth shattering
advice, but collectively it can mean the difference between an easy
file to work with and a complete pain in the ...well you know.


* **Prefer machine readable formats** - "Pretty printers" for reports
   have a lot of utility: they can make it easy for users to view and
   understand results. However, they also have disadvantages: it's
   harder to use "pretty" reports for the further downstream
   processing that someone will inevitably want to do. This is
   something that needs to be considered carefully, keeping your
   audience in mind, but if possible, pick a format that a machine can
   easily work with.

* **Use a standard file format** - There are lots of standard formats
    available for reports and feeds: XML, CSV, Tab Delimited,
    S-Expression, INI File, etc.  Use one of these. Tools already
    exist to process and manipulate these kinds of files, and one of
    these formats **will** be able to contain your data.

* **Prefer the simplest format that will work** - The simpler the
    format, the easier it will be to parse/handle. CSV is a good
    example of this: XML is sexier and much more powerful, but CSV has
    been around forever and has many more tools. A good example of
    what I mean is XML support in Excel. Excel has been getting XML
    support in the most recent versions, but it's had CSV support
    since the beginning. Also, from a conceptual standpoint, anybody
    who can understand a spreadsheet can understand a tabular file,
    but hierarchical data is considerably more complex a
    concept. <i>(In business settings, there's a very good chance your
    feed/report audience will be business analysts that know Excel
    backwards and forwards but have no technical computer science
    training.)</i>

* **Prefer delimited formats to formats based on field widths** - The
    thing about having columns based on field widths (column 1 is 10
    characters wide, column 2 is 20, etc.) is that you have to
    remember and specify the field widths when you want to extract out
    the tabular data. In the worst case, without the column widths you
    can't read your file at all. In the best case, it's just something
    else you have to do when you load a file.

* **If you specify column names, ensure they are unique.** - This
    isn't necessary for a lot of data analysis tools, but some tools
    (cough... MS Access) get confused when importing a table with
    multiple columns of the same name.

* **Include a header that describes the feed.** - To fully understand
     the contents of a file, you really have to understand what it
     contains and where it came from. This is useful both in testing
     (did this report come from build 28 or build 29?) and in
     production (when was this file generated?) My suggestions for
     header contents include:

    * The version of the report specification
    * Name of the source application
    * Version of the source application (This version number should be updated with **every build**.)
    * Environment in which the source application was running to produce the report.
    * The date on which the report was run
    * If the report has an effective date, include it too.

* **Document your report** - Without good, precise documention of your
   file format, it'll be very hard to reliably consume files in the
   format. Similarly, have as many people as possible peer review your
   file format. Even if your system's code is complete garbage, the
   file format represents an interface to your system that will
   possibly live much longer than the system itself.

