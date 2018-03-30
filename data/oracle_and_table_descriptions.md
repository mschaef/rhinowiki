title: Oracle and Table Descriptions
date: 2007-05-15
filename: ./tech/general/oracle_and_table_descriptions.txt

The other day, I created a table in Oracle with the following command. This 
is written in the subset of <a href="http://en.wikipedia.org/wiki/SQL"> 
SQL</a> known as DDL, or Data Defintion Language.

```sql
CREATE TABLE COMMON.SAMPLE_TABLE (
  NAME      VARCHAR(64) NOT NULL,
  STATUS    CHAR(1),
  X_C       NUMBER (10),
  Y_C       NUMBER (*,10) NOT NULL, 
  Z_C       NUMBER (*,10),
  FOO       VARCHAR2 (18) NOT NULL, 
  BAR       DATE,
  BAZ       TIMESTAMP
 )
/
```

Once the table is created, it is then possible to ask the database to 
describe the table:

```text
common@XE> desc COMMON.SAMPLE_TABLE;
 Name                          Null?    Type
 ----------------------------- -------- ----------------------------
 NAME                          NOT NULL VARCHAR2(64)
 STATUS                                 CHAR(1)
 X_C                                    NUMBER(10)
 Y_C                           NOT NULL NUMBER(38,10)
 Z_C                                    NUMBER(38,10)
 FOO                           NOT NULL VARCHAR2(18)
 BAR                                    DATE
 BAZ                                    TIMESTAMP(6)
```

For some reason, the syntax of Oracle's description of the table's
definition is entirely different than the syntax of the DDL used to
define the table in the first place. Not only does the description not
use DDL, minor details are different too. For example, the relative
placement of the nullability (<tt>NOT NULL</tt>) of a column and its
data type is reversed from one representation to the other. This makes
converting a table description into corresponding DDL a trickier
process than it would be otherwise. Another difference (loss?) is that
the DDL syntax allows for table specific attributes and the
description syntax does not. That means that the table's full
description really might look something like this:

```sql
CREATE TABLE COMMON.SAMPLE_TABLE (
  NAME      VARCHAR(64) NOT NULL,
  STATUS    CHAR(1),
  X_C       NUMBER (10),
  Y_C       NUMBER (*,10) NOT NULL, 
  Z_C       NUMBER (*,10),
  FOO       VARCHAR2 (18) NOT NULL, 
  BAR       DATE,
  BAZ       TIMESTAMP
 )
LOGGING 
NOCOMPRESS 
NOCACHE
NOPARALLEL
MONITORING
/
```

So, if you rely on a table description as the basis for creating a
duplicate copy of a table, you not only have to do specific work to
convert the description from description syntax to DDL, the DDL you
end up with will likely be incomplete.  While I am sure that there is
an excellent reason for the syntactic split between the two types of
table descriptions, I honesly cannot think of it. My current best
theory is that SQL*Plus and SQLNET cannot handle non-table returns
from a database request. Because of this, the table description has to
itself be a table. You could even make the argument that this is the
'right' way to do things, since it gives you a table description in a
form (a table) that database code should easily be able to
manipulate. However, the description is itself incomplete, so I'm not
sure how useful that explanation is.

I'm not a database guru, but it seems like another way to handle this
possible limitation is to have the table description query return a
one row, one column table with a BLOB or VARCHAR2 containing the DDL
description.  SQL*Plus could then special case the display of this
query to make it look nice on the screen. (SQL*Plus already does
special case <tt>desc</tt> queries, since their display does not honor
calls to <tt>SET PAGESIZE</tt>.  If you really do need table
information in tabular form, there are always the <tt>ALL_TABLES</tt>
and <tt>ALL_TAB_COLS</tt> views. (Of course, a really wonderful
solution to all of this would be to make those views writable, somehow
standardize them, and then skip the DDL entirely. :-)
