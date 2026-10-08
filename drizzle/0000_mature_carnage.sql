CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`expires` integer NOT NULL
);
