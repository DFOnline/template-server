CREATE TABLE "templates" (
	"id"	INTEGER NOT NULL UNIQUE,
	"template"	TEXT NOT NULL UNIQUE,
	"delete_key"	TEXT,
	"delete_by"	INTEGER,
	PRIMARY KEY("id","template")
);