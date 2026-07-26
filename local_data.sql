--
-- PostgreSQL database dump
--

\restrict IQOr0LbIagcJ0yk9XefT2zbNiaRVQnXN00n9N7pdlnI0Txe1nhjLFc4a3NUdaid

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2026-05-19 03:40:20 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 4269 (class 0 OID 18494)
-- Dependencies: 440
-- Data for Name: app_users; Type: TABLE DATA; Schema: public; Owner: -
-- Data Pos: 0
--

COPY public.app_users (id, email, email_verified, display_name, phone, created_at, updated_at, photo_url, measurement_system, shoe_size_system, distance_unit, date_format, height, weight, shoe_size, birthdate, last_login, strava) FROM stdin;
bccd9e81-8780-414c-b596-f4e69690b6f6	sagelovestheforest@gmail.com	t	Sage Davies	778-953-6717	2026-04-07 02:40:12.59136+00	2026-04-07 02:40:12.59136+00	\N	imperial	us-mens	km	YYYY/MM/DD	193.03989575845628	146.05691683827598	13	1973-11-05	\N	{"athlete_id": 176291991, "expires_at": 1779178334, "access_token": "2b1ba6b19a79462d2934946332a0c9b224c92f13", "refresh_token": "d75aa4b801f7fb65adbada8a119ab4bff3065cc6", "processed_activities": ["18485288805", "18478535735", "17608270672", "17602450421", "18014605927"]}
\.


--
-- TOC entry 4273 (class 0 OID 18572)
-- Dependencies: 444
-- Data for Name: bike_models; Type: TABLE DATA; Schema: public; Owner: -
-- Data Pos: 0
--

COPY public.bike_models (id, brand, model, model_year, frame_size, slug, image_url, created_by, created_at, updated_at, type) FROM stdin;
2e062aab-0024-41d0-be89-b75ad8ff9dc4	Norco	Threshold C2	2014	\N	norco-threshold-c2-2014	https://placehold.co/600x400.png	bccd9e81-8780-414c-b596-f4e69690b6f6	2026-04-14 05:31:56.837+00	2026-04-14 05:31:56.837+00	Gravel/Cyclocross
\.


--
-- TOC entry 4274 (class 0 OID 18917)
-- Dependencies: 445
-- Data for Name: master_components; Type: TABLE DATA; Schema: public; Owner: -
-- Data Pos: 0
--

COPY public.master_components (id, name, brand, series, model, size, size_variants, embedding, created_at, updated_at, system, recommended_interval_km, replacement_interval_km, observed_interval_km_avg, observed_interval_km_count, observed_interval_km_median, slug, chainring1, chainring2, chainring3) FROM stdin;
24a2e523-e0a4-4372-ab22-9a9649cde483	Frame	Norco	\N	Threshold Cross 30T High-Mod	30T	\N	\N	2026-04-14 05:31:56.844785+00	2026-04-14 05:31:56.844785+00	Frameset	\N	\N	\N	0	\N	norco-frame-threshold-cross-30t-high-mod	\N	\N	\N
a569475b-4477-4065-9ffe-4d3056e72368	Fork	Norco	\N	Threshold Full Tapered	\N	\N	\N	2026-04-14 05:31:56.849176+00	2026-04-14 05:31:56.849176+00	Frameset	\N	\N	\N	0	\N	norco-fork-threshold-full-tapered	\N	\N	\N
8c42fc8c-be47-47c6-b88c-12b8bc78b4be	Headset	FSA	\N	No.42B/Cup Tapered	9mm	\N	\N	2026-04-14 05:31:56.852976+00	2026-04-14 05:31:56.852976+00	Frameset	\N	\N	\N	0	\N	fsa-headset-no-42b-cup-tapered	\N	\N	\N
795bb5b0-057d-4bc0-9059-2a720b2403a6	Crankset	SRAM	\N	S350 PF30	\N	\N	\N	2026-04-14 05:31:56.855855+00	2026-04-14 05:31:56.855855+00	Drivetrain	\N	\N	\N	0	\N	sram-crankset-s350-pf30	46	36	\N
30a01da6-1487-4ba8-ba6f-5a07e98b7cf8	Bottom Bracket	SRAM	\N	PressFit30	\N	\N	\N	2026-04-14 05:31:56.857477+00	2026-04-14 05:31:56.857477+00	Drivetrain	\N	\N	\N	0	\N	sram-bottom-bracket-pressfit30	\N	\N	\N
b98fca47-bfc5-4c2c-83cb-3e1e84f90579	Front Derailleur	Shimano	105	FD-5700L	\N	\N	\N	2026-04-14 05:31:56.860033+00	2026-04-14 05:31:56.860033+00	Drivetrain	\N	\N	\N	0	\N	shimano-front-derailleur-fd-5700l	\N	\N	\N
3cfd352c-dc34-4de0-bf8a-8fb7a1eeb520	Rear Derailleur	Shimano	105	RD-5701	\N	\N	\N	2026-04-14 05:31:56.87499+00	2026-04-14 05:31:56.87499+00	Drivetrain	\N	\N	\N	0	\N	shimano-rear-derailleur-rd-5701	\N	\N	\N
b249bef8-5135-4266-95c4-d6a980e647c9	Cassette	Shimano	Tiagra	CS-4600	12-28T	\N	\N	2026-04-14 05:31:56.87878+00	2026-04-14 05:31:56.87878+00	Drivetrain	\N	\N	\N	0	\N	shimano-cassette-cs-4600	\N	\N	\N
a36daee3-0dab-4b32-b145-8f7d10cdf429	Front Shifter	Shimano	105	ST-5700L	\N	\N	\N	2026-04-14 05:31:56.882258+00	2026-04-14 05:31:56.882258+00	Drivetrain	\N	\N	\N	0	\N	shimano-front-shifter-st-5700l	\N	\N	\N
bae0a01b-ccb3-45fb-a0df-e5a75f912c54	Rear Shifter	Shimano	105	ST-5700R	\N	\N	\N	2026-04-14 05:31:56.886218+00	2026-04-14 05:31:56.886218+00	Drivetrain	\N	\N	\N	0	\N	shimano-rear-shifter-st-5700r	\N	\N	\N
d221d738-9965-436c-8601-095ac8349d00	Chain	SRAM	\N	CN-PC1031	\N	\N	\N	2026-04-14 05:31:56.891286+00	2026-04-14 05:31:56.891286+00	Drivetrain	\N	\N	\N	0	\N	sram-chain-cn-pc1031	\N	\N	\N
f825078b-6c76-4366-97d7-af9060a2f595	Front Brake	Hayes	\N	CX-5	\N	\N	\N	2026-04-14 05:31:56.897903+00	2026-04-14 05:31:56.897903+00	Brakes	\N	\N	\N	0	\N	hayes-front-brake-cx-5	\N	\N	\N
dfc627b5-5282-44a8-985e-e48809acfbef	Rear Brake	Hayes	\N	CX-5	\N	\N	\N	2026-04-14 05:31:56.902319+00	2026-04-14 05:31:56.902319+00	Brakes	\N	\N	\N	0	\N	hayes-rear-brake-cx-5	\N	\N	\N
9e14e2d6-d9f3-45ef-9fa5-f9169173fbe8	Front Rotor	Hayes	\N	\N	160mm	\N	\N	2026-04-14 05:31:56.906524+00	2026-04-14 05:31:56.906524+00	Brakes	\N	\N	\N	0	\N	hayes-front-rotor	\N	\N	\N
2a546cfe-6bae-4f72-959e-4fee245e7593	Rear Rotor	Hayes	\N	\N	140mm	\N	\N	2026-04-14 05:31:56.910935+00	2026-04-14 05:31:56.910935+00	Brakes	\N	\N	\N	0	\N	hayes-rear-rotor	\N	\N	\N
c3d898b7-4196-46f1-81e9-7c6d40883cbb	Brake Levers	Shimano	105	ST-5700	\N	\N	\N	2026-04-14 05:31:56.915309+00	2026-04-14 05:31:56.915309+00	Brakes	\N	\N	\N	0	\N	shimano-brake-levers-st-5700	\N	\N	\N
331fb050-e689-4828-9af9-dc206df2c160	Front Hub	SRAM	\N	306	\N	\N	\N	2026-04-14 05:31:56.918969+00	2026-04-14 05:31:56.918969+00	Wheelset	\N	\N	\N	0	\N	sram-front-hub-306	\N	\N	\N
68d34548-2d0f-4a8d-9d03-39e06c96ad07	Rear Hub	SRAM	\N	306	\N	\N	\N	2026-04-14 05:31:56.920441+00	2026-04-14 05:31:56.920441+00	Wheelset	\N	\N	\N	0	\N	sram-rear-hub-306	\N	\N	\N
0d227159-5e21-4737-99f3-fbf1419aef3f	Front Rim	Alex	\N	ATD490	\N	\N	\N	2026-04-14 05:31:56.922604+00	2026-04-14 05:31:56.922604+00	Wheelset	\N	\N	\N	0	\N	alex-front-rim-atd490	\N	\N	\N
1dba0125-e38d-4eaf-9a79-2da9a81cb9bc	Rear Rim	Alex	\N	ATD490	\N	\N	\N	2026-04-14 05:31:56.924035+00	2026-04-14 05:31:56.924035+00	Wheelset	\N	\N	\N	0	\N	alex-rear-rim-atd490	\N	\N	\N
863baf8b-0f07-45dc-8da4-259e167da9c9	Front Tire	Clement	\N	Crusade PDX	700 x 33c	\N	\N	2026-04-14 05:31:56.925343+00	2026-04-14 05:31:56.925343+00	Wheelset	\N	\N	\N	0	\N	clement-front-tire-crusade-pdx	\N	\N	\N
4e58cb24-7bc2-424c-ae73-0ee122892de6	Rear Tire	Clement	\N	Crusade PDX	700 x 33c	\N	\N	2026-04-14 05:31:56.92671+00	2026-04-14 05:31:56.92671+00	Wheelset	\N	\N	\N	0	\N	clement-rear-tire-crusade-pdx	\N	\N	\N
35caeb1f-f3e2-41fc-99ad-0b8439efbd15	Handlebar	Norco	\N	Compact	\N	\N	\N	2026-04-14 05:31:56.929251+00	2026-04-14 05:31:56.929251+00	Cockpit	\N	\N	\N	0	\N	norco-handlebar-compact	\N	\N	\N
31a5f685-cd80-4b87-a252-06815e4cbf12	Stem	Norco	\N	\N	\N	\N	\N	2026-04-14 05:31:56.930897+00	2026-04-14 05:31:56.930897+00	Cockpit	\N	\N	\N	0	\N	norco-stem	\N	\N	\N
5726c09f-89a2-44b3-bf75-a954de4a9aa3	Seatpost	Norco	\N	27.2mm	27.2mm	\N	\N	2026-04-14 05:31:56.932908+00	2026-04-14 05:31:56.932908+00	Cockpit	\N	\N	\N	0	\N	norco-seatpost-27-2mm	\N	\N	\N
8fa21039-4a6c-40d3-9f6d-a2525f0bb78a	Saddle	Norco	\N	\N	\N	\N	\N	2026-04-14 05:31:56.935141+00	2026-04-14 05:31:56.935141+00	Cockpit	\N	\N	\N	0	\N	norco-saddle	\N	\N	\N
571bcba1-75a4-43cf-8656-7e28eaa65fc3	Grips	Norco	\N	\N	\N	\N	\N	2026-04-14 05:31:56.937381+00	2026-04-14 05:31:56.937381+00	Cockpit	\N	\N	\N	0	\N	norco-grips	\N	\N	\N
08f49fa4-9fd8-4980-b4e5-9dbc474001bc	Seatpost Clamp	Norco	\N	\N	\N	\N	\N	2026-04-14 05:31:56.939701+00	2026-04-14 05:31:56.939701+00	Cockpit	\N	\N	\N	0	\N	norco-seatpost-clamp	\N	\N	\N
b9db8b52-14d3-4ef5-a005-e56f99a02264	Rear Derailleur	Shimano	Tiagra	RD-4700	10	\N	\N	2026-04-17 14:39:45.494621+00	2026-04-17 14:39:45.494621+00	Drivetrain	\N	\N	\N	0	\N	shimano-rear-derailleur-rd-4700-10	\N	\N	\N
f3944d30-5c10-4423-95e4-cea03af1f800	Chain	KMC	\N	x10.93	10	\N	\N	2026-04-18 17:54:44.745212+00	2026-04-18 17:54:44.745212+00	Drivetrain	\N	\N	\N	0	\N	kmc-chain-x10-93-10	\N	\N	\N
6f9b034e-9894-46a5-888d-4e4cb4bbbca9	Cassette	Shimano	\N	CS-HG500-10	10	\N	\N	2026-04-18 18:04:50.933325+00	2026-04-18 18:04:50.933325+00	Drivetrain	\N	\N	\N	0	\N	shimano-cassette-cs-hg500-10-10	\N	\N	\N
92277d1b-f58b-427b-815d-9543dac20789	Frame	Kona	\N	Ouroboros Supreme	\N	\N	\N	2026-04-19 00:04:15.594646+00	2026-04-19 00:04:15.594646+00	Frameset	\N	\N	\N	0	\N	kona-frame-ouroboros-supreme	\N	\N	\N
7cd91da1-6c79-4ce4-8fbc-23fada63f7dc	Fork	RockShox	Rudy Ultimate XPLR, Charger Race Day, 40mm travel, tapered, 100 x	Rudy Ultimate XPLR	40mm	\N	\N	2026-04-19 00:04:15.599104+00	2026-04-19 00:04:15.599104+00	Frameset	\N	\N	\N	0	\N	rockshox-fork-rudy-ultimate-xplr	\N	\N	\N
78711cc4-5160-4a01-ba74-4580aa6ea4f7	Headset	FSA	Orbit No. 57, ZS	Orbit No. 57	44/56	\N	\N	2026-04-19 00:04:15.601529+00	2026-04-19 00:04:15.601529+00	Frameset	\N	\N	\N	0	\N	fsa-headset-orbit-no-57	\N	\N	\N
ca87335d-7bd2-4040-8a43-684a520fb542	Crankset	SRAM	\N	Crankarms Force 1 DUB Wide	\N	\N	\N	2026-04-19 00:04:15.603069+00	2026-04-19 00:04:15.603069+00	Drivetrain	\N	\N	\N	0	\N	sram-crankset-crankarms-force-1-dub-wide	\N	\N	\N
b34dc0d9-0f1e-44ef-afa2-0c388cd7603e	Bottom Bracket	SRAM	\N	Press-Fit 86.5 DUB Wide	\N	\N	\N	2026-04-19 00:04:15.604886+00	2026-04-19 00:04:15.604886+00	Drivetrain	\N	\N	\N	0	\N	sram-bottom-bracket-press-fit-86-5-dub-wide	\N	\N	\N
4f636e1d-fdb9-4ac2-ac2d-22e06b21c91e	Rear Derailleur	SRAM	\N	XO Eagle Transmission	\N	\N	\N	2026-04-19 00:04:15.607007+00	2026-04-19 00:04:15.607007+00	Drivetrain	\N	\N	\N	0	\N	sram-rear-derailleur-xo-eagle-transmission	\N	\N	\N
5586c2dd-c69b-4941-bde8-9be29e32051f	Cassette	SRAM	XO Eagle Transmission 10-52t,	XD	10-52t	\N	\N	2026-04-19 00:04:15.610637+00	2026-04-19 00:04:15.610637+00	Drivetrain	\N	\N	\N	0	\N	sram-cassette-xd	\N	\N	\N
2ee57330-66df-4069-864b-bf2b7003fa70	Front Shifter	SRAM	Force ETAP	AXS	\N	\N	\N	2026-04-19 00:04:15.612531+00	2026-04-19 00:04:15.612531+00	Drivetrain	\N	\N	\N	0	\N	sram-front-shifter-axs	\N	\N	\N
46b9068b-6943-424d-8617-86911d1f354b	Rear Shifter	SRAM	Force ETAP	AXS	\N	\N	\N	2026-04-19 00:04:15.614316+00	2026-04-19 00:04:15.614316+00	Drivetrain	\N	\N	\N	0	\N	sram-rear-shifter-axs	\N	\N	\N
4d81b1cb-f664-4fa1-9b00-0fd34779adf2	Chain	SRAM	\N	X0 Eagle Transmission Flattop	\N	\N	\N	2026-04-19 00:04:15.616173+00	2026-04-19 00:04:15.616173+00	Drivetrain	\N	\N	\N	0	\N	sram-chain-x0-eagle-transmission-flattop	\N	\N	\N
7a1dda88-eb48-47c7-9107-022938f4cec1	Front Brake	SRAM	\N	Force	\N	\N	\N	2026-04-19 00:04:15.617613+00	2026-04-19 00:04:15.617613+00	Brakes	\N	\N	\N	0	\N	sram-front-brake-force	\N	\N	\N
38d63427-0a37-4969-b8fe-a2b37245fd56	Rear Brake	SRAM	\N	Force	\N	\N	\N	2026-04-19 00:04:15.619212+00	2026-04-19 00:04:15.619212+00	Brakes	\N	\N	\N	0	\N	sram-rear-brake-force	\N	\N	\N
0b05a0fe-2168-40f5-a51a-ce53be9c7c27	Front Rotor	SRAM	Centerline Centerlock	SRAM Centerline Centerlock 180mm	180mm	\N	\N	2026-04-19 00:04:15.620838+00	2026-04-19 00:04:15.620838+00	Brakes	\N	\N	\N	0	\N	sram-front-rotor-sram-centerline-centerlock-180mm	\N	\N	\N
a71b9c7f-b94c-48f4-a1c6-24f483ba4503	Rear Rotor	SRAM	Centerline Centerlock	SRAM Centerline Centerlock 180mm	180mm	\N	\N	2026-04-19 00:04:15.622075+00	2026-04-19 00:04:15.622075+00	Brakes	\N	\N	\N	0	\N	sram-rear-rotor-sram-centerline-centerlock-180mm	\N	\N	\N
5cb855a6-fc9a-4914-b010-20dbcc78de50	Brake Levers	SRAM	Force ETAP	AXS	\N	\N	\N	2026-04-19 00:04:15.623492+00	2026-04-19 00:04:15.623492+00	Brakes	\N	\N	\N	0	\N	sram-brake-levers-axs	\N	\N	\N
22c26152-b076-43be-abbb-b5b342c5f6be	Front Hub	Zipp	101	XPLR	\N	\N	\N	2026-04-19 00:04:15.624909+00	2026-04-19 00:04:15.624909+00	Wheelset	\N	\N	\N	0	\N	zipp-front-hub-xplr	\N	\N	\N
717796a2-e518-4469-a958-0fd6a2c9f73c	Rear Hub	Zipp	101	XPLR	\N	\N	\N	2026-04-19 00:04:15.626695+00	2026-04-19 00:04:15.626695+00	Wheelset	\N	\N	\N	0	\N	zipp-rear-hub-xplr	\N	\N	\N
8347df1e-f196-4834-9c54-5fd0a70c7fdd	Front Rim	Zipp	\N	101 XPLR	27mm	\N	\N	2026-04-19 00:04:15.628206+00	2026-04-19 00:04:15.628206+00	Wheelset	\N	\N	\N	0	\N	zipp-front-rim-101-xplr	\N	\N	\N
1ce4b526-33de-4338-ab9e-cbbc4b8364c3	Rear Rim	Zipp	\N	101 XPLR	27mm	\N	\N	2026-04-19 00:04:15.629659+00	2026-04-19 00:04:15.629659+00	Wheelset	\N	\N	\N	0	\N	zipp-rear-rim-101-xplr	\N	\N	\N
1b1f9710-7119-4e25-80ec-9d8b09be0724	Front Tire	Maxxis	\N	Ravager 700 x 50mm TR EXO	50mm	\N	\N	2026-04-19 00:04:15.631911+00	2026-04-19 00:04:15.631911+00	Wheelset	\N	\N	\N	0	\N	maxxis-front-tire-ravager-700-x-50mm-tr-exo	\N	\N	\N
a7713341-aac8-46a7-b32f-eb2423077d31	Rear Tire	Maxxis	\N	Ravager 700 x 50mm TR EXO	50mm	\N	\N	2026-04-19 00:04:15.633189+00	2026-04-19 00:04:15.633189+00	Wheelset	\N	\N	\N	0	\N	maxxis-rear-tire-ravager-700-x-50mm-tr-exo	\N	\N	\N
baf62c45-3fdc-4683-82f4-54e2a495a884	Seatpost	RockShox	\N	Reverb AXS	31.6mm	\N	\N	2026-04-19 00:04:15.646002+00	2026-04-19 00:04:15.646002+00	Cockpit	\N	\N	\N	0	\N	rockshox-seatpost-reverb-axs	\N	\N	\N
624a9e61-4ce6-4125-a0b1-fdd86ed837e5	Handlebar	Kona	Ritchey Venturemax WCS/Venturemax XL WCS, 24-degree flare, 4.6-degree backsweep, 48-50:	460mm	460mm	\N	\N	2026-04-19 00:04:15.634428+00	2026-04-19 00:04:15.634428+00	Cockpit	\N	\N	\N	0	\N	kona-handlebar-460mm	\N	\N	\N
8cf9599e-dde6-45ac-8318-8ef4f2c8f368	Stem	Kona	Kona	Ritchey Trail WCS, 0-degree, 48-52: 45mm	45mm	\N	\N	2026-04-19 00:04:15.644466+00	2026-04-19 00:04:15.644466+00	Cockpit	\N	\N	\N	0	\N	kona-stem-ritchey-trail-wcs-0-degree-48-52-45mm	\N	\N	\N
92a99a93-d877-4386-856f-a0ca8254e243	Saddle	WTB	\N	\N	\N	\N	\N	2026-04-19 00:04:15.647649+00	2026-04-19 00:04:15.647649+00	Cockpit	\N	\N	\N	0	\N	wtb-saddle	\N	\N	\N
1a01ce68-cb32-4eb0-9720-3732d972aa69	Chainring	SRAM	Force 1 Wide 40t X-Sync, direct mount	\N	40t	\N	\N	2026-04-19 00:04:15.64903+00	2026-04-19 00:04:15.64903+00	Drivetrain	\N	\N	\N	0	\N	sram-chainring	\N	\N	\N
0f7462eb-7bd4-4fee-b8cd-e265cd5b407c	Bar Tape	Kona	Grips Smanie Elite	\N	\N	\N	\N	2026-04-19 00:04:15.650417+00	2026-04-19 00:04:15.650417+00	Cockpit	\N	\N	\N	0	\N	kona-bar-tape	\N	\N	\N
\.


--
-- TOC entry 4275 (class 0 OID 19540)
-- Dependencies: 446
-- Data for Name: bike_model_components; Type: TABLE DATA; Schema: public; Owner: -
-- Data Pos: 0
--

COPY public.bike_model_components (id, bike_model_id, master_component_id, component_name, system, "position", size, chainring1, chainring2, chainring3, created_at, updated_at) FROM stdin;
74212548-2f7f-49bc-b13b-3fcc3918071c	2e062aab-0024-41d0-be89-b75ad8ff9dc4	24a2e523-e0a4-4372-ab22-9a9649cde483	Frame	Frameset	Frame	30T	\N	\N	\N	2026-04-14 05:31:57.040251+00	2026-04-14 05:31:57.040251+00
be6bc479-d291-461d-827a-370b72666d05	2e062aab-0024-41d0-be89-b75ad8ff9dc4	a569475b-4477-4065-9ffe-4d3056e72368	Fork	Frameset	Fork	\N	\N	\N	\N	2026-04-14 05:31:57.046018+00	2026-04-14 05:31:57.046018+00
7e2e09f1-884e-4af6-9ccf-6cfe3ac725af	2e062aab-0024-41d0-be89-b75ad8ff9dc4	8c42fc8c-be47-47c6-b88c-12b8bc78b4be	Headset	Frameset	Headset	9mm	\N	\N	\N	2026-04-14 05:31:57.048956+00	2026-04-14 05:31:57.048956+00
8bf3e2b0-2644-4be0-a853-a82d59c58d63	2e062aab-0024-41d0-be89-b75ad8ff9dc4	795bb5b0-057d-4bc0-9059-2a720b2403a6	Crankset	Drivetrain	Crankset	\N	46	36	\N	2026-04-14 05:31:57.051523+00	2026-04-14 05:31:57.051523+00
37d1b9d4-0ea7-4c04-ac45-a58922cf83d5	2e062aab-0024-41d0-be89-b75ad8ff9dc4	30a01da6-1487-4ba8-ba6f-5a07e98b7cf8	Bottom Bracket	Drivetrain	Bottom Bracket	\N	\N	\N	\N	2026-04-14 05:31:57.053693+00	2026-04-14 05:31:57.053693+00
f6d6e3dd-779b-4727-9e9e-af5c1cfc61c8	2e062aab-0024-41d0-be89-b75ad8ff9dc4	b98fca47-bfc5-4c2c-83cb-3e1e84f90579	Front Derailleur	Drivetrain	Front Derailleur	\N	\N	\N	\N	2026-04-14 05:31:57.056191+00	2026-04-14 05:31:57.056191+00
77855893-6caa-4b81-82d4-b39c975d8e37	2e062aab-0024-41d0-be89-b75ad8ff9dc4	3cfd352c-dc34-4de0-bf8a-8fb7a1eeb520	Rear Derailleur	Drivetrain	Rear Derailleur	\N	\N	\N	\N	2026-04-14 05:31:57.058126+00	2026-04-14 05:31:57.058126+00
b0432178-cbab-41c8-9c0d-a1dbe47e3781	2e062aab-0024-41d0-be89-b75ad8ff9dc4	b249bef8-5135-4266-95c4-d6a980e647c9	Cassette	Drivetrain	Cassette	12-28T	\N	\N	\N	2026-04-14 05:31:57.059961+00	2026-04-14 05:31:57.059961+00
57ad859c-7db3-462d-89e8-8c3c98bcd6d0	2e062aab-0024-41d0-be89-b75ad8ff9dc4	a36daee3-0dab-4b32-b145-8f7d10cdf429	Front Shifter	Drivetrain	Front Shifter	\N	\N	\N	\N	2026-04-14 05:31:57.062671+00	2026-04-14 05:31:57.062671+00
63d029d3-9f1a-47aa-8645-963638ae2b4f	2e062aab-0024-41d0-be89-b75ad8ff9dc4	bae0a01b-ccb3-45fb-a0df-e5a75f912c54	Rear Shifter	Drivetrain	Rear Shifter	\N	\N	\N	\N	2026-04-14 05:31:57.06474+00	2026-04-14 05:31:57.06474+00
0ede789f-9902-4757-a01e-e9249e0e8312	2e062aab-0024-41d0-be89-b75ad8ff9dc4	d221d738-9965-436c-8601-095ac8349d00	Chain	Drivetrain	Chain	\N	\N	\N	\N	2026-04-14 05:31:57.066+00	2026-04-14 05:31:57.066+00
22f0c1ec-0b05-4a29-8452-d93a2fff3e54	2e062aab-0024-41d0-be89-b75ad8ff9dc4	f825078b-6c76-4366-97d7-af9060a2f595	Front Brake	Brakes	Front Brake	\N	\N	\N	\N	2026-04-14 05:31:57.0683+00	2026-04-14 05:31:57.0683+00
3969f15d-7521-409c-acfe-20d0ca759c51	2e062aab-0024-41d0-be89-b75ad8ff9dc4	dfc627b5-5282-44a8-985e-e48809acfbef	Rear Brake	Brakes	Rear Brake	\N	\N	\N	\N	2026-04-14 05:31:57.070124+00	2026-04-14 05:31:57.070124+00
419950c9-8bb5-4fcf-a6c6-4abd721d6d34	2e062aab-0024-41d0-be89-b75ad8ff9dc4	9e14e2d6-d9f3-45ef-9fa5-f9169173fbe8	Front Rotor	Brakes	Front Rotor	160mm	\N	\N	\N	2026-04-14 05:31:57.071754+00	2026-04-14 05:31:57.071754+00
8aae48b5-4a56-463c-9279-25ce7d8b9932	2e062aab-0024-41d0-be89-b75ad8ff9dc4	2a546cfe-6bae-4f72-959e-4fee245e7593	Rear Rotor	Brakes	Rear Rotor	140mm	\N	\N	\N	2026-04-14 05:31:57.072945+00	2026-04-14 05:31:57.072945+00
6220901e-f6fb-4e0c-9a0d-5fb0fcedf86a	2e062aab-0024-41d0-be89-b75ad8ff9dc4	c3d898b7-4196-46f1-81e9-7c6d40883cbb	Brake Levers	Brakes	Brake Levers	\N	\N	\N	\N	2026-04-14 05:31:57.07439+00	2026-04-14 05:31:57.07439+00
c3023b98-fc8c-4f72-bc9f-d97ba27673b3	2e062aab-0024-41d0-be89-b75ad8ff9dc4	331fb050-e689-4828-9af9-dc206df2c160	Front Hub	Wheelset	Front Hub	\N	\N	\N	\N	2026-04-14 05:31:57.075405+00	2026-04-14 05:31:57.075405+00
56ed3b91-8a14-41ef-b73e-37280046a69d	2e062aab-0024-41d0-be89-b75ad8ff9dc4	68d34548-2d0f-4a8d-9d03-39e06c96ad07	Rear Hub	Wheelset	Rear Hub	\N	\N	\N	\N	2026-04-14 05:31:57.076508+00	2026-04-14 05:31:57.076508+00
186fe0d7-1810-4ce8-876b-6eb05df1e1fe	2e062aab-0024-41d0-be89-b75ad8ff9dc4	0d227159-5e21-4737-99f3-fbf1419aef3f	Front Rim	Wheelset	Front Rim	\N	\N	\N	\N	2026-04-14 05:31:57.077535+00	2026-04-14 05:31:57.077535+00
657d777a-5424-4813-8324-2055a6b8079c	2e062aab-0024-41d0-be89-b75ad8ff9dc4	1dba0125-e38d-4eaf-9a79-2da9a81cb9bc	Rear Rim	Wheelset	Rear Rim	\N	\N	\N	\N	2026-04-14 05:31:57.078584+00	2026-04-14 05:31:57.078584+00
febba998-8516-4652-b042-1c55d4f8436e	2e062aab-0024-41d0-be89-b75ad8ff9dc4	863baf8b-0f07-45dc-8da4-259e167da9c9	Front Tire	Wheelset	Front Tire	700 x 33c	\N	\N	\N	2026-04-14 05:31:57.080434+00	2026-04-14 05:31:57.080434+00
458cfecb-4135-4087-8317-a89173f481c3	2e062aab-0024-41d0-be89-b75ad8ff9dc4	4e58cb24-7bc2-424c-ae73-0ee122892de6	Rear Tire	Wheelset	Rear Tire	700 x 33c	\N	\N	\N	2026-04-14 05:31:57.081381+00	2026-04-14 05:31:57.081381+00
290f2eb8-4f23-442f-8f76-1d0a0e3faf92	2e062aab-0024-41d0-be89-b75ad8ff9dc4	35caeb1f-f3e2-41fc-99ad-0b8439efbd15	Handlebar	Cockpit	Handlebar	\N	\N	\N	\N	2026-04-14 05:31:57.082471+00	2026-04-14 05:31:57.082471+00
22036b3a-00a1-451b-b14a-e7ad8d23bb02	2e062aab-0024-41d0-be89-b75ad8ff9dc4	31a5f685-cd80-4b87-a252-06815e4cbf12	Stem	Cockpit	Stem	\N	\N	\N	\N	2026-04-14 05:31:57.083807+00	2026-04-14 05:31:57.083807+00
08070db0-a833-456d-ad7e-33d21f59db11	2e062aab-0024-41d0-be89-b75ad8ff9dc4	5726c09f-89a2-44b3-bf75-a954de4a9aa3	Seatpost	Cockpit	Seatpost	27.2mm	\N	\N	\N	2026-04-14 05:31:57.084924+00	2026-04-14 05:31:57.084924+00
24404ce2-2d59-4091-ace8-42ff0dfc850f	2e062aab-0024-41d0-be89-b75ad8ff9dc4	8fa21039-4a6c-40d3-9f6d-a2525f0bb78a	Saddle	Cockpit	Saddle	\N	\N	\N	\N	2026-04-14 05:31:57.085833+00	2026-04-14 05:31:57.085833+00
1c7943d8-a3ee-4bb6-bd81-dcfaf9e3f1de	2e062aab-0024-41d0-be89-b75ad8ff9dc4	571bcba1-75a4-43cf-8656-7e28eaa65fc3	Grips	Cockpit	Grips	\N	\N	\N	\N	2026-04-14 05:31:57.087097+00	2026-04-14 05:31:57.087097+00
3117c36a-220c-44c2-a9be-5758421495f6	2e062aab-0024-41d0-be89-b75ad8ff9dc4	08f49fa4-9fd8-4980-b4e5-9dbc474001bc	Seatpost Clamp	Cockpit	Seatpost Clamp	\N	\N	\N	\N	2026-04-14 05:31:57.088118+00	2026-04-14 05:31:57.088118+00
\.


--
-- TOC entry 4270 (class 0 OID 18508)
-- Dependencies: 441
-- Data for Name: equipment; Type: TABLE DATA; Schema: public; Owner: -
-- Data Pos: 0
--

COPY public.equipment (id, user_id, app_user_id, name, type, brand, model, model_year, serial_number, frame_size, purchase_date, purchase_price, total_distance, total_hours, image_url, maintenance_log, associated_equipment_ids, created_at, updated_at, master_bike_model_id, purchase_condition, size, shoe_size_system, wheelsets, fit_data, archived_components) FROM stdin;
932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	bccd9e81-8780-414c-b596-f4e69690b6f6	Prancer	Gravel/Cyclocross	Norco	Threshold C2	2014	\N	59	2022-02-10	1100	141.4753	9.612222222222222	https://placehold.co/600x400.png	[{"id": "6a69b7c3-edce-4a77-b68f-fdf34573f2ff", "cost": 0, "date": null, "notes": "Original part was SRAM CN-PC1031. Reason: modification.", "is_oem": false, "log_type": "modification", "description": "Replaced Chain.", "service_type": "diy", "replacement_part": "KMC  x10.93", "component_replaced": true}, {"id": "92e18b4d-2e94-4aa2-afc1-ccd45058b7a9", "cost": 0, "date": null, "notes": "Original part was Shimano CS-4600. Reason: modification.", "is_oem": true, "log_type": "modification", "description": "Replaced Cassette.", "service_type": "diy", "replacement_part": "Shimano  CS-HG500-10", "component_replaced": true}]	\N	2026-04-14 05:31:56.837+00	2026-04-14 05:31:56.837+00	2e062aab-0024-41d0-be89-b75ad8ff9dc4	used	\N	\N	\N	{"stem_length": 110, "saddle_angle": 6, "has_aero_bars": false, "saddle_height": 973, "cleat_position": {"lateral": 0, "fore_aft": 0, "rotational": 0}}	[{"name": "Chain", "size": null, "brand": "SRAM", "model": "CN-PC1031", "series": null, "system": "Drivetrain", "replaced_on": "2026-04-18T17:54:44.732Z", "final_mileage": 0, "purchase_date": "1970-01-01T00:00:00.000Z", "wear_percentage": 0, "last_service_date": null, "replacement_reason": "modification"}, {"name": "Cassette", "size": "12-28T", "brand": "Shimano", "model": "CS-4600", "series": "Tiagra", "system": "Drivetrain", "replaced_on": "2026-04-18T18:04:50.914Z", "final_mileage": 0, "purchase_date": "1970-01-01T00:00:00.000Z", "wear_percentage": 0, "last_service_date": null, "replacement_reason": "modification"}]
\.


--
-- TOC entry 4271 (class 0 OID 18530)
-- Dependencies: 442
-- Data for Name: components; Type: TABLE DATA; Schema: public; Owner: -
-- Data Pos: 0
--

COPY public.components (id, equipment_id, user_id, master_component_id, wear_percentage, purchase_date, last_service_date, notes, size, created_at, updated_at, installed_at_distance, current_distance, expected_replacement_km, is_active, replacement_count, installed_at, parent_user_component_id, name, wheelset_id, replaced_by_user) FROM stdin;
d7739b20-81de-4db0-b2db-97d992c9c891	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	795bb5b0-057d-4bc0-9059-2a720b2403a6	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.724+00	2026-04-14 05:31:56.724+00	0	0	\N	t	0	2026-04-14 05:31:56.724+00	\N	Crankset	\N	f
7aa70029-c6c1-4206-8910-101d2491a05d	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	30a01da6-1487-4ba8-ba6f-5a07e98b7cf8	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.732+00	2026-04-14 05:31:56.732+00	0	0	\N	t	0	2026-04-14 05:31:56.732+00	\N	Bottom Bracket	\N	f
c358c241-7d47-41ea-b22d-80f905b50301	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	b98fca47-bfc5-4c2c-83cb-3e1e84f90579	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.735+00	2026-04-14 05:31:56.735+00	0	0	\N	t	0	2026-04-14 05:31:56.735+00	\N	Front Derailleur	\N	f
9cb0cf2f-ac6a-4bd3-9d80-b204fced3e1d	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	68d34548-2d0f-4a8d-9d03-39e06c96ad07	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.78+00	2026-04-14 05:31:56.78+00	0	0	\N	t	0	2026-04-14 05:31:56.78+00	\N	Rear Hub	\N	f
0870a0ec-bf19-42f2-936a-52d2a6474ef2	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	0d227159-5e21-4737-99f3-fbf1419aef3f	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.796+00	2026-04-14 05:31:56.796+00	0	0	\N	t	0	2026-04-14 05:31:56.796+00	\N	Front Rim	\N	f
52e93c5d-c944-489e-968b-481f769c72b9	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	1dba0125-e38d-4eaf-9a79-2da9a81cb9bc	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.801+00	2026-04-14 05:31:56.801+00	0	0	\N	t	0	2026-04-14 05:31:56.801+00	\N	Rear Rim	\N	f
3228fcb5-d4a5-41f6-946b-517fd3c64cb6	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	a36daee3-0dab-4b32-b145-8f7d10cdf429	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.753+00	2026-04-14 05:31:56.753+00	0	0	\N	t	0	2026-04-14 05:31:56.753+00	\N	Front Shifter	\N	f
15bd86be-f8ee-4d69-9c27-bb216ee13fc1	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	bae0a01b-ccb3-45fb-a0df-e5a75f912c54	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.756+00	2026-04-14 05:31:56.756+00	0	0	\N	t	0	2026-04-14 05:31:56.756+00	\N	Rear Shifter	\N	f
c0e22e19-2cc7-43cc-8b15-1ef7d805be97	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	f825078b-6c76-4366-97d7-af9060a2f595	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.762+00	2026-04-14 05:31:56.762+00	0	0	\N	t	0	2026-04-14 05:31:56.762+00	\N	Front Brake	\N	f
b74adde0-3b2a-419f-877c-21ca2e14f35c	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	35caeb1f-f3e2-41fc-99ad-0b8439efbd15	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.813+00	2026-04-14 05:31:56.813+00	0	0	\N	t	0	2026-04-14 05:31:56.813+00	\N	Handlebar	\N	f
9aeeefe7-cd01-4b32-9753-4df01e5d0925	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	31a5f685-cd80-4b87-a252-06815e4cbf12	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.819+00	2026-04-14 05:31:56.819+00	0	0	\N	t	0	2026-04-14 05:31:56.819+00	\N	Stem	\N	f
ac37fb18-491d-41e4-914c-08be9726fefc	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	08f49fa4-9fd8-4980-b4e5-9dbc474001bc	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.837+00	2026-04-14 05:31:56.837+00	0	0	\N	t	0	2026-04-14 05:31:56.837+00	\N	Seatpost Clamp	\N	f
d5ac92a3-7ed9-468e-8125-2cabddd37a28	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	dfc627b5-5282-44a8-985e-e48809acfbef	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.765+00	2026-04-14 05:31:56.765+00	0	0	\N	t	0	2026-04-14 05:31:56.765+00	\N	Rear Brake	\N	f
ba8fbe5f-f0f7-4845-a52d-90a4c375f91e	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	9e14e2d6-d9f3-45ef-9fa5-f9169173fbe8	8.77	\N	\N	\N	160mm	2026-04-14 05:31:56.769+00	2026-04-14 05:31:56.769+00	0	0	\N	t	0	2026-04-14 05:31:56.769+00	\N	Front Rotor	\N	f
86fcf0f0-6e08-4aab-a289-720a25f2f4d3	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	b9db8b52-14d3-4ef5-a005-e56f99a02264	8.77	\N	\N	Replaced on 4/17/2026	10	2026-04-14 05:31:56.738+00	2026-04-14 05:31:56.738+00	0	0	\N	t	0	2026-04-14 05:31:56.738+00	\N	Rear Derailleur	\N	t
f0bd1f15-c3dd-4af4-9fea-ce5c61f489be	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	8fa21039-4a6c-40d3-9f6d-a2525f0bb78a	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.825+00	2026-04-14 05:31:56.825+00	0	0	\N	t	0	2026-04-14 05:31:56.825+00	\N	Saddle	\N	f
c70c0249-1b81-4685-85b7-c486cf3b035f	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	571bcba1-75a4-43cf-8656-7e28eaa65fc3	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.832+00	2026-04-14 05:31:56.832+00	0	0	\N	t	0	2026-04-14 05:31:56.832+00	\N	Grips	\N	f
3e2bd754-c442-4140-aacd-b329a84d14b5	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	24a2e523-e0a4-4372-ab22-9a9649cde483	8.77	\N	\N	\N	30T	2026-04-14 05:31:56.681+00	2026-04-14 05:31:56.681+00	0	0	\N	t	0	2026-04-14 05:31:56.681+00	\N	Frame	\N	f
73180c3b-4cb5-45fc-9e30-0e5fc1ac41e8	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	a569475b-4477-4065-9ffe-4d3056e72368	9.64	\N	\N	\N	\N	2026-04-14 05:31:56.697+00	2026-04-14 05:31:56.697+00	0	0	\N	t	0	2026-04-14 05:31:56.697+00	\N	Fork	\N	f
b43dce85-0e9f-4fab-8a28-4e221c132fe3	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	5726c09f-89a2-44b3-bf75-a954de4a9aa3	8.77	\N	\N	\N	27.2mm	2026-04-14 05:31:56.822+00	2026-04-14 05:31:56.822+00	0	0	\N	t	0	2026-04-14 05:31:56.822+00	\N	Seatpost	\N	f
41c4f11f-4ea9-4daa-b685-a27c1822f545	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	f3944d30-5c10-4423-95e4-cea03af1f800	8.77	\N	\N	Replaced on 4/18/2026	10	2026-04-14 05:31:56.759+00	2026-04-14 05:31:56.759+00	0	0	\N	t	0	2026-04-14 05:31:56.759+00	\N	Chain	\N	t
75ce6197-87ef-4a00-8675-e3bdbd8dec78	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	6f9b034e-9894-46a5-888d-4e4cb4bbbca9	8.77	\N	\N	Replaced on 4/18/2026	10	2026-04-14 05:31:56.745+00	2026-04-14 05:31:56.745+00	0	0	\N	t	0	2026-04-14 05:31:56.745+00	\N	Cassette	\N	t
e7aa087c-6ca0-4272-a69d-8b4f8241670d	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	2a546cfe-6bae-4f72-959e-4fee245e7593	8.77	\N	\N	\N	140mm	2026-04-14 05:31:56.772+00	2026-04-14 05:31:56.772+00	0	0	\N	t	0	2026-04-14 05:31:56.772+00	\N	Rear Rotor	\N	f
ef73e984-05b9-4516-b194-8496f0244855	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	8c42fc8c-be47-47c6-b88c-12b8bc78b4be	8.77	\N	\N	\N	9mm	2026-04-14 05:31:56.715+00	2026-04-14 05:31:56.715+00	0	0	\N	t	0	2026-04-14 05:31:56.715+00	\N	Headset	\N	f
2203509c-c8b1-4555-be10-a8a70c30bd09	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	c3d898b7-4196-46f1-81e9-7c6d40883cbb	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.774+00	2026-04-14 05:31:56.774+00	0	0	\N	t	0	2026-04-14 05:31:56.774+00	\N	Brake Levers	\N	f
51da91fd-ddcf-49c0-b155-418214cd8eec	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	331fb050-e689-4828-9af9-dc206df2c160	8.77	\N	\N	\N	\N	2026-04-14 05:31:56.776+00	2026-04-14 05:31:56.776+00	0	0	\N	t	0	2026-04-14 05:31:56.776+00	\N	Front Hub	\N	f
70580446-196c-45aa-9110-081a33344e95	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	863baf8b-0f07-45dc-8da4-259e167da9c9	10.08	\N	\N	\N	700 x 33c	2026-04-14 05:31:56.805+00	2026-04-14 05:31:56.805+00	0	0	\N	t	0	2026-04-14 05:31:56.805+00	\N	Front Tire	\N	f
2a24c86b-202c-419d-a0a3-1ddb9416931c	932b812e-f46c-45a8-8ad6-d223ae29fa71	bccd9e81-8780-414c-b596-f4e69690b6f6	4e58cb24-7bc2-424c-ae73-0ee122892de6	10.08	\N	\N	\N	700 x 33c	2026-04-14 05:31:56.808+00	2026-04-14 05:31:56.808+00	0	0	\N	t	0	2026-04-14 05:31:56.808+00	\N	Rear Tire	\N	f
\.


--
-- TOC entry 4276 (class 0 OID 19562)
-- Dependencies: 447
-- Data for Name: component_replacement_events; Type: TABLE DATA; Schema: public; Owner: -
-- Data Pos: 0
--

COPY public.component_replacement_events (id, equipment_id, equipment_component_id, master_component_id, actual_interval_km, replacement_reason, replaced_at_distance, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4272 (class 0 OID 18551)
-- Dependencies: 443
-- Data for Name: work_orders; Type: TABLE DATA; Schema: public; Owner: -
-- Data Pos: 0
--

COPY public.work_orders (id, user_id, user_name, user_phone, user_email, service_provider_id, service_provider_auth_uid, provider_name, equipment_id, equipment_name, equipment_brand, equipment_model, service_type, status, notes, fit_data, user_consent, created_at, updated_at) FROM stdin;
\.


-- Completed on 2026-05-19 04:33:53 UTC

--
-- PostgreSQL database dump complete
--

\unrestrict IQOr0LbIagcJ0yk9XefT2zbNiaRVQnXN00n9N7pdlnI0Txe1nhjLFc4a3NUdaid

