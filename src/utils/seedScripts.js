import db from '@/lib/db'

const SCRIPTS_LIBRARY_VERSION = 'v5-29'

const TRADES = [
  'plumber',
  'electrician',
  'hvac',
  'pest control',
  'landscaping',
  'cleaning',
]

const WEBSITE_INDUSTRIES = [
  ...TRADES,
  'clothing store',
  'coffee shop',
  'restaurant',
  'bakery',
  'salon',
  'barbershop',
  'gym',
]

const CRM_INDUSTRIES = [
  ...TRADES,
  'coffee shop',
  'restaurant',
  'salon',
  'barbershop',
  'gym',
]

const ALL_INDUSTRIES = [
  ...TRADES,
  'clothing store',
  'coffee shop',
  'smoothie bar',
  'food truck',
  'restaurant',
  'bakery',
  'salon',
  'barbershop',
  'gym',
]

const SEED_SCRIPTS = [
  {
    name: 'No Website — Service Business',
    type: 'cold_call',
    industry_tags: WEBSITE_INDUSTRIES,
    problem_tags: ['no_website'],
    opening:
      'Hey, is this the owner? Quick question — do you currently have a website where new customers can find you and book your services?',
    problem_hook:
      "I looked up your business and noticed you don't have a website — most of your competitors do, which means you're probably losing jobs to them without even knowing it.",
    value_prop:
      'I build professional websites for service businesses like yours — not just a pretty page, but something that actually brings in calls and new customers.',
    cta:
      "Would you be open to a quick 10-minute call this week so I can show you exactly what I'd build for you?",
    objections: [
      { trigger: 'not interested', response: "Totally fair — can I ask, are you happy with how many new customers you're getting right now?" },
      { trigger: 'too expensive', response: 'I get that. What if it paid for itself with just one new customer? Most clients see ROI in the first month.' },
      { trigger: 'already have one', response: "That's great — is it currently bringing in new clients consistently or mainly just sitting there?" },
      { trigger: 'call me later', response: "Of course — when's a good time? I'll put it in my calendar right now." },
      { trigger: 'i get clients by word of mouth', response: "That's awesome — word of mouth is the best. A website just means when someone recommends you, the new customer can actually find you and trust you immediately." },
    ],
  },
  {
    name: 'Poor Website — Needs Upgrade',
    type: 'cold_call',
    industry_tags: WEBSITE_INDUSTRIES,
    problem_tags: ['poor_website'],
    opening:
      'Hey, is this the owner? I actually visited your website and had a quick thought I wanted to share with you.',
    problem_hook:
      "Your website is there which is great — but honestly it's not doing your business justice. It looks outdated and probably isn't converting visitors into calls.",
    value_prop:
      'I specialize in rebuilding service business websites so they actually look professional and turn visitors into paying customers. Most of my clients double their online inquiries after a rebuild.',
    cta:
      'Could I show you in 10 minutes what a modern version of your site would look like?',
    objections: [
      { trigger: 'not interested', response: 'No problem — out of curiosity, how many calls or inquiries do you get from your website per month right now?' },
      { trigger: 'too expensive', response: "What would one extra job per month be worth to you? That's usually all it takes to pay for the whole thing." },
      { trigger: 'i like my website', response: "I respect that — have you compared it recently to your top competitors in the area? I can pull them up side by side if you'd like." },
      { trigger: 'call me later', response: 'Absolutely — what time works for you tomorrow?' },
    ],
  },
  {
    name: 'No CRM — Losing Track of Customers',
    type: 'cold_call',
    industry_tags: CRM_INDUSTRIES,
    problem_tags: ['no_crm', 'manual_processes'],
    opening:
      'Hey, is this the owner? Quick question — do you have a system to track your customers and jobs, or is it still mostly phone calls and spreadsheets?',
    problem_hook:
      "Most service businesses I talk to are losing repeat jobs and follow-up opportunities simply because there's no system keeping track — it's all in someone's head or a notebook.",
    value_prop:
      'I build simple business management systems for trades businesses — you get one place to manage customers, jobs, invoices, and follow-ups. No more lost leads or forgotten callbacks.',
    cta:
      'Could I show you in 10 minutes what this would look like for your business specifically?',
    objections: [
      { trigger: 'not interested', response: 'No problem — out of curiosity, how do you currently keep track of your customers and follow-ups?' },
      { trigger: 'too expensive', response: 'What I charge is usually recovered with just one or two repeat jobs you would have otherwise forgotten. Can I show you the math?' },
      { trigger: 'already have something', response: "That's great — is it built specifically for your type of business or is it a generic tool like Excel?" },
      { trigger: 'call me later', response: 'Sure — what time works best for you tomorrow?' },
      { trigger: 'i dont need it', response: 'Totally understand — how many customers do you have right now? Because past a certain number it becomes really hard to keep track manually.' },
    ],
  },
  {
    name: 'Full Package — Website + CRM',
    type: 'cold_call',
    industry_tags: ALL_INDUSTRIES,
    problem_tags: ['no_website', 'no_crm', 'manual_processes'],
    opening:
      'Hey, is this the owner? I work with service businesses in the area and I noticed a couple of things about yours I wanted to talk to you about.',
    problem_hook:
      "You don't have a website bringing in new customers, and from what I can tell there's no system managing your existing ones — that's two places you're losing money every single week.",
    value_prop:
      'I offer a complete solution — a professional website that brings in new leads combined with a simple system to manage all your customers and jobs. Most businesses I work with see the difference within 60 days.',
    cta:
      'I put together a quick overview specifically for businesses like yours — would you have 15 minutes this week to take a look?',
    objections: [
      { trigger: 'too expensive', response: 'I offer both together at a better rate than separately — and honestly the combination is what makes the real difference. What budget were you thinking?' },
      { trigger: 'not interested', response: 'Fair enough — which part interests you less, the website or the system side?' },
      { trigger: 'call me later', response: "Of course — what day works best? I'll reach out then." },
      { trigger: 'need to think', response: "Totally — what's the main thing you'd want to think through? Maybe I can answer it right now." },
    ],
  },
  {
    name: 'Low Reviews — Reputation Problem',
    type: 'cold_call',
    industry_tags: ALL_INDUSTRIES,
    problem_tags: ['low_reviews'],
    opening:
      'Hey, is this the owner? I was looking at your Google listing and had a thought I wanted to share.',
    problem_hook:
      "Your review score is lower than most of your competitors in the area — and studies show that most people won't even contact a business with under 4 stars, no matter how good they actually are.",
    value_prop:
      'Part of what I build includes a simple system that automatically follows up with your customers after a job and makes it easy for them to leave a review. Most clients double their reviews in 60 days.',
    cta: 'Would you be open to a quick call to see how this works?',
    objections: [
      { trigger: 'reviews dont matter', response: 'They actually matter more than ever — 87% of people check reviews before choosing a local service business. Want me to show you what your competitors look like online?' },
      { trigger: 'not interested', response: 'No problem — are you happy with how many new customers are finding you online right now?' },
      { trigger: 'too expensive', response: 'One extra job from a new customer who found you because of better reviews covers the whole cost. Does that math make sense?' },
      { trigger: 'call me later', response: 'Of course — when works best for you?' },
    ],
  },
  {
    name: 'Follow-Up — Spoke Before, Sent Info',
    type: 'follow_up',
    industry_tags: ALL_INDUSTRIES,
    problem_tags: ['no_website', 'no_crm'],
    opening:
      'Hey [name], this is Eugene — we spoke last week and I sent over some information about the website and system I build for businesses like yours.',
    problem_hook:
      "I just wanted to follow up and see if you had a chance to take a look — I think there's a real opportunity here for your business.",
    value_prop:
      "I've worked with a few similar businesses recently and the results have been solid. I'd love to walk you through it properly if you have 10 minutes.",
    cta: 'Do you have time for a quick call this week?',
    objections: [
      { trigger: 'didnt see it', response: "No problem — I can resend it right now. What's the best email or WhatsApp to use?" },
      { trigger: 'not interested', response: "Understood — can I ask what changed or was there something specific that didn't feel like a fit?" },
      { trigger: 'still thinking', response: 'Of course — what questions can I answer to help you decide?' },
      { trigger: 'too busy', response: "I totally get it — that's actually why this system exists, to save you time. Can we do just 10 minutes?" },
    ],
  },
  {
    name: 'Follow-Up — No Answer, Second Attempt',
    type: 'follow_up',
    industry_tags: ALL_INDUSTRIES,
    problem_tags: ['no_website', 'no_crm', 'manual_processes'],
    opening:
      "Hey [name], this is Eugene — I tried reaching you last week about something I think could really help your business. Didn't want to give up without at least leaving a message.",
    problem_hook:
      "I help service businesses get a proper website and a system to manage their customers — a lot of businesses in your industry are losing jobs just because they're hard to find online or losing track of follow-ups.",
    value_prop:
      "I keep it simple, affordable, and I handle everything from start to finish. You don't need to be tech-savvy at all.",
    cta:
      "If this sounds relevant, give me a call back at [your number] or I'll try you again later this week.",
    objections: [
      { trigger: 'not interested', response: "No problem at all — thanks for letting me know. Can I ask which part doesn't feel relevant for your business?" },
      { trigger: 'already sorted', response: "That's great to hear — just out of curiosity, what are you using for your website and customer management?" },
      { trigger: 'call me later', response: "Absolutely — when's a good time?" },
    ],
  },
  {
    name: 'Follow-Up — After Proposal Sent',
    type: 'follow_up',
    industry_tags: ALL_INDUSTRIES,
    problem_tags: ['no_website', 'no_crm'],
    opening:
      'Hey [name], Eugene here — I sent over the proposal a few days ago and just wanted to check in.',
    problem_hook:
      'I know things get busy — I just want to make sure you had a chance to review it and that everything made sense.',
    value_prop:
      "I'm confident this will make a real difference for your business — and I'm happy to adjust anything in the proposal if needed.",
    cta:
      'Do you have any questions or is there anything stopping you from moving forward?',
    objections: [
      { trigger: 'too expensive', response: "Let's talk about that — is it the total or the timing? I may be able to work with you on the structure." },
      { trigger: 'need more time', response: "Of course — what would make this an easy yes? Let's address it right now." },
      { trigger: 'going with someone else', response: 'I respect that — can I ask who you went with? Just so I understand what won you over.' },
      { trigger: 'didnt read it', response: "No problem — want me to walk you through it quickly right now? It'll take 5 minutes." },
    ],
  },
  {
    name: 'Price Objection — Full Handler',
    type: 'objection',
    industry_tags: ALL_INDUSTRIES,
    problem_tags: ['no_website', 'no_crm'],
    opening:
      'I completely understand — budget is always a real consideration and I respect that.',
    problem_hook:
      "The question isn't really what it costs — it's what it costs you NOT to have it. Every month without a proper website or system is jobs going to competitors.",
    value_prop:
      'My pricing is structured so that the first 1-2 extra jobs you get cover the entire investment. After that it\'s pure profit. I also offer flexible payment options.',
    cta: 'Can I show you the numbers so you can make a fully informed decision?',
    objections: [
      { trigger: 'still too expensive', response: "What budget would make this work for you? Tell me a number and let's see if we can structure something." },
      { trigger: 'not worth it', response: 'Fair — what would make it worth it to you? What outcome would you need to see?' },
      { trigger: 'maybe later', response: 'When specifically? I ask because the businesses that wait usually lose the most — their competitors keep moving.' },
      { trigger: 'need to ask my partner', response: 'Of course — would it help if I joined a quick call with both of you so I can answer questions directly?' },
    ],
  },
  {
    name: 'Already Has Something — Objection',
    type: 'objection',
    industry_tags: ALL_INDUSTRIES,
    problem_tags: ['no_crm', 'poor_website'],
    opening: "That's great — I'm glad you already have something in place.",
    problem_hook:
      "A lot of businesses I talk to have something, but it's either not built for their specific type of work or it's not being fully used.",
    value_prop:
      "What I build is custom to your business — your job types, your pricing, your workflow. It's not a generic tool. And I train you and your team on how to actually use it.",
    cta: 'Would you be open to a 10-minute comparison so you can see the difference?',
    objections: [
      { trigger: 'happy with what i have', response: "That's genuinely great to hear — out of curiosity, what are you using? I'm always learning about what works well in the market." },
      { trigger: 'dont want to switch', response: 'Totally understand switching costs. What if I showed you what you\'re missing without any commitment to change anything?' },
      { trigger: 'too much hassle', response: "I handle the entire migration and setup — you don't touch anything. I just need your input on how your business runs." },
    ],
  },
  {
    name: 'Closing — Move Forward This Week',
    type: 'closing',
    industry_tags: ALL_INDUSTRIES,
    problem_tags: ['no_website', 'no_crm', 'manual_processes'],
    opening: 'Hey [name], just circling back on the proposal I sent over.',
    problem_hook:
      'I know you were seriously considering this — and honestly every week without it is potential customers going to a competitor and jobs falling through the cracks.',
    value_prop:
      "Everything we discussed is included — the build, the setup, and I'll be there for support after. I handle everything from start to finish, you just need to say go.",
    cta:
      'Are you ready to get started this week? I can have things moving within 24 hours of your confirmation.',
    objections: [
      { trigger: 'need more time', response: "Totally fair — what specifically is holding you back? Let's address it right now." },
      { trigger: 'too expensive', response: "Let's talk about that — is it the total amount or the timing? There may be a way to structure this better for you." },
      { trigger: 'not ready', response: 'I respect that — when do you think you will be? I want to make sure I hold your spot.' },
      { trigger: 'need to think', response: 'Of course — what would make this an easy yes for you?' },
    ],
  },
  {
    name: 'Closing — Website Only',
    type: 'closing',
    industry_tags: WEBSITE_INDUSTRIES,
    problem_tags: ['no_website', 'poor_website'],
    opening: 'Hey [name], following up on the website proposal.',
    problem_hook:
      "Right now customers are searching for your services online and finding your competitors instead of you — that's real money walking out the door every week.",
    value_prop:
      "I'll build you a clean, professional website that shows up in local searches and converts visitors into calls. Delivery in 2 weeks, everything included.",
    cta: 'Can we lock this in today? I just need a simple yes and we get started.',
    objections: [
      { trigger: 'too expensive', response: 'What if I told you one new customer from the website pays for the whole thing? That usually happens in the first month.' },
      { trigger: 'not now', response: 'When would be a better time? I want to plan around your schedule.' },
      { trigger: 'need to see examples', response: "Absolutely — I can send you 3 examples of sites I've built for similar businesses right now. What's your WhatsApp?" },
      { trigger: 'my nephew can do it', response: "That's great if he has the time — the question is whether it'll be done in 2 weeks and whether it'll actually bring in customers. That's what I guarantee." },
    ],
  },

  /* ===== Papiamento (7) ===== */
  {
    name: 'Prome Contacto — Sin Website',
    type: 'cold_call',
    language: 'papiamento',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_website'],
    opening: 'Halo, ta e doño ta? Mi ta Eugene — mi tin un preguntanan cortiku pa bo si bo tin un momentu.',
    problem_hook: 'Mi a busca bo negoshi online i mi a nota cu bo no tin un website. E problema ta cu clientenan ta busca bo pero nan no por haña bo — i nan ta dal pa bo competencia sin bo sa di dje.',
    value_prop: 'Mi ta bouw websitenan pa negoshinan lokal cu realmente trese clientenan nobo — no solamente un pagina bunita, pero algo cu realmente traha.',
    cta: 'Bo ta open pa un yamadita di 10 minüt pa mi mustrabo loke mi por hasi pa bo?',
    objections: [
      { trigger: 'no ta interesa', response: 'Okay, respeto dje! Pero dimi — bo ta contento cu e cantidad di cliente nobo cu bo ta haña aworaki?' },
      { trigger: 'muy caro', response: 'Mi ta sabi. Pero imagina si un solo cliente nobo paga tur e costo. Mayoría di mi clientenan ta logra esaki den e prome luna mesun.' },
      { trigger: 'tin un ya', response: 'Ah ta bon! E ta trayendo cliente nobo realmente of e ta keda asina parada?' },
      { trigger: 'yama mi despues', response: 'Claro claro — ki ora ta miho pa bo? Mi lo pone den mi agenda awor mesora.' },
    ],
  },
  {
    name: 'Prome Contacto — Sin Sistema',
    type: 'cold_call',
    language: 'papiamento',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_crm', 'manual_processes'],
    opening: 'Halo! Ta e doño mes ta? Bo tin un minüt? Mi tin algo cu mi kere bo lo haña interesante.',
    problem_hook: 'Hopi negoshinan aki na Aruba ta pèrdè cliente i trabou pasobra nan no tin un sistema pa sigui tur cos. Tur cos ta keda den e cabes of den un cuaderno, i cosnan ta kai for di man.',
    value_prop: 'Mi ta bouw sistèmanan simpel pa negoshi — un lugá pa maneha bo clientenan, bo trabounan, bo fakturanan i bo seguimientonan. No mas cosnan cu ta slip through.',
    cta: 'Mi por mustrabo den 10 minüt con esaki ta mira pa bo negoshi specificamente?',
    objections: [
      { trigger: 'no ta interesa', response: 'Ta bon! Pero dimi un cos — con bo ta sigui bo clientenan i seguimientonan aworaki?' },
      { trigger: 'muy caro', response: 'Loke mi cobra generalmente ta wordo recupera cu 1 of 2 trabou extra cu bo lo a miss sin esaki. Mi por mustrabo e cifranan?' },
      { trigger: 'tin algo ya', response: 'Chevere! E ta bouw specificamente pa bo tipo di negoshi of ta algo mas generiko manera Excel?' },
      { trigger: 'yama despues', response: 'Seguro — ki dia ta miho pa bo?' },
    ],
  },
  {
    name: 'Seguimento — A Papia Antes',
    type: 'follow_up',
    language: 'papiamento',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_website', 'no_crm'],
    opening: 'Halo [nòmber]! Ta Eugene ta. Nos a papia algun dia pasa tokante e website/sistema pa bo negoshi.',
    problem_hook: 'Mi a manda bo e informacion i mi ta haña oportunidad pa check in — bo a haña oportunidad pa mira dje?',
    value_prop: 'Mi a traha cu varios negoshi similar aki na Aruba i e resultadonan ta solido. Mi kier mustrabo loke ta posibel pa bo specificamente.',
    cta: 'Bo tin 10 minüt e siman aki pa nos papia rapido?',
    objections: [
      { trigger: 'no a mira dje', response: 'Ningun problema — mi manda dje awo mesora. Ki ta e miho WhatsApp of email pa bo?' },
      { trigger: 'ainda ta pensa', response: 'Claro — ki pregunta mi por kontesta pa yuda bo dicidi?' },
      { trigger: 'ta oküpa', response: 'Mi ta sabi, bo ta busy. Pero esaki ta exactamente pakiko e sistema ta bal e 10 minüt — e ta salbabo tempu tur siman.' },
    ],
  },
  {
    name: 'Ceramento — Listo pa Avansa',
    type: 'closing',
    language: 'papiamento',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_website', 'no_crm'],
    opening: 'Halo [nòmber]! Ta Eugene ta. Mi ta sigui riba e propuesta cu mi a manda bo.',
    problem_hook: 'Mi sa bo a considera dje — i honestamente, cada siman sin esaki ta cliente cu ta bai pa bo competencia.',
    value_prop: 'Tur cos cu nos a papia ta inclui — e construccion, setup, i mi ta disponibel pa soporte despues. Mi ta maneha tur cos, bo no mester preokupa di nada.',
    cta: 'Bo ta listo pa cuminsa e siman aki? Mi por tin cos muoviendo den 24 ora di bo confirmacion.',
    objections: [
      { trigger: 'mester mas tempu', response: 'Ta bon — pero dimi, ki specificamente ta deteniébo? Laga nos trata dje awor mesora.' },
      { trigger: 'muy caro', response: 'Laga nos papia tokante dje — ta e cantidad total of e timing? Tin manera di structura dje miho pa bo.' },
      { trigger: 'no ta listo ainda', response: 'Mi respeta dje — pero ki ora bo kier bo lo ta listo? Mi kier reserva un lugar pa bo.' },
    ],
  },
  {
    name: 'Obheshon di Presio',
    type: 'objection',
    language: 'papiamento',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_website', 'no_crm'],
    opening: 'Mi ta compronde kompletamente — presupuesto ta siempre algo real i mi respeta dje.',
    problem_hook: 'Pero e pregunta real no ta loke e kosta — ta loke e kosta pa NO tene. Cada luna sin website of sistema ta trabounan cu ta bay pa bo competencia sin bo realized.',
    value_prop: 'Mi precio ta structura asina cu e prome 1 of 2 trabou extra cu bo haña ta paga tur e inversion. Despues di dje ta puro ganashi. Mi tambe tin opcionnan di pago flexible si bo nesesita.',
    cta: 'Laga mi mustrabo e calculacionnan pa bo por tuma un decision cu tur e informacion?',
    objections: [
      { trigger: 'ainda muy caro', response: 'Ki presupuesto lo funciona pa bo? Dami un nümero i laga nos mira si nos por traha algo.' },
      { trigger: 'no ta bal e pena', response: 'Ta hunsto — ki lo hasi e pena pa bo? Ki resultado bo mester mira?' },
      { trigger: 'kizas mas despues', response: 'Ki ora specificamente? Mi ta pregunta pasobra negoshinan cu ta warda usualmente ta pèrdè mas — nan competencia ta sigui mover.' },
    ],
  },
  {
    name: 'Bon Bini — Cliente Nobo',
    type: 'closing',
    language: 'papiamento',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_website', 'no_crm'],
    opening: 'Halo [nòmber]! Bon bini na famia COS Studios! 🎉 Mi ta realmente contento cu bo a dicidi avansa.',
    problem_hook: 'Awo nos ta cuminsa construi algo cu realmente lo cambia con bo negoshi ta core.',
    value_prop: 'E siguiente paso ta un yamadita di descubrimento di 30 minüt caminda nos ta papia tokante con bo negoshi ta funciona exactamente. Asina nos asegura cu loke nos bouw ta perfect pa bo.',
    cta: 'Ki dia i ora ta bon pa bo e siman aki? Mi ta flexible.',
    objections: [],
  },
  {
    name: 'Seguimento — Sin Respuesta',
    type: 'follow_up',
    language: 'papiamento',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_website', 'no_crm', 'manual_processes'],
    opening: 'Halo [nòmber], ta Eugene di COS Studios ta. Mi a purba kontaktabo e siman pasa tokante algo cu mi kere lo yuda bo negoshi.',
    problem_hook: 'Mi ta bouw websitenan i sistèmanan pa negoshinan lokal — hopi ta pèrdè cliente pasobra nan ta dificil pa haña online of nan no tin sistema pa sigui cosnan.',
    value_prop: 'Mi ta mantene tur cos simpel, asequibel i mi ta maneha tur cos for di cuminso te fin. Bo no mester sa nada di teknologia.',
    cta: 'Si esaki ta relevant pa bo, yama mi bèk na [bo nümero] of mi lo try again e siman aki.',
    objections: [
      { trigger: 'no ta interesa', response: 'Ningun problema — ki parti no ta relevant pa bo negoshi?' },
      { trigger: 'tin algo ya', response: 'Ta bon di scucha — ki bo ta usando pa bo website i maneho di cliente aworaki?' },
    ],
  },

  /* ===== Spanish (7) ===== */
  {
    name: 'Primer Contacto — Sin Sitio Web',
    type: 'cold_call',
    language: 'spanish',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_website'],
    opening: 'Hola, ¿es el dueño? Tengo una pregunta rápida — ¿actualmente tienes un sitio web donde nuevos clientes puedan encontrarte y contactarte?',
    problem_hook: 'Revisé tu negocio en línea y noté que no tienes sitio web. La mayoría de tus competidores sí tienen, lo que significa que probablemente estás perdiendo trabajos sin saberlo.',
    value_prop: 'Construyo sitios web profesionales para negocios de servicio como el tuyo — no solo una página bonita, sino una herramienta real que atrae llamadas de nuevos clientes.',
    cta: '¿Estarías dispuesto a una llamada rápida de 10 minutos para mostrarte exactamente lo que construiría para ti?',
    objections: [
      { trigger: 'no me interesa', response: 'Totalmente válido — ¿puedo preguntar, estás satisfecho con la cantidad de clientes nuevos que estás recibiendo ahora?' },
      { trigger: 'muy caro', response: 'Lo entiendo. ¿Y si se pagara solo con un cliente nuevo? La mayoría de mis clientes ven el retorno en el primer mes.' },
      { trigger: 'ya tengo uno', response: '¡Qué bien! ¿Está trayendo clientes nuevos de forma consistente o principalmente está ahí?' },
      { trigger: 'llámame después', response: 'Por supuesto — ¿cuándo es buen momento? Lo pongo en mi calendario ahora mismo.' },
    ],
  },
  {
    name: 'Primer Contacto — Sin Sistema',
    type: 'cold_call',
    language: 'spanish',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_crm', 'manual_processes'],
    opening: 'Hola, ¿está el dueño? Pregunta rápida — ¿tienes un sistema para rastrear tus clientes y trabajos, o todavía es principalmente llamadas y hojas de cálculo?',
    problem_hook: 'La mayoría de negocios de servicio que contacto están perdiendo trabajos de seguimiento y clientes recurrentes simplemente porque no hay un sistema que lleve el registro.',
    value_prop: 'Construyo sistemas simples de gestión empresarial para negocios de oficios — tienes un lugar para gestionar clientes, trabajos, facturas y seguimientos. No más oportunidades perdidas.',
    cta: '¿Podría mostrarte en 10 minutos cómo se vería esto para tu negocio específicamente?',
    objections: [
      { trigger: 'no me interesa', response: 'Sin problema — por curiosidad, ¿cómo llevas el registro de tus clientes y seguimientos ahora?' },
      { trigger: 'muy caro', response: 'Lo que cobro generalmente se recupera con solo 1-2 trabajos extra que de otra forma olvidarías. ¿Te muestro los números?' },
      { trigger: 'ya tengo algo', response: '¡Perfecto! ¿Está construido específicamente para tu tipo de negocio o es una herramienta genérica como Excel?' },
      { trigger: 'llámame después', response: 'Claro — ¿cuándo es el mejor momento para ti mañana?' },
    ],
  },
  {
    name: 'Seguimiento — Hablamos Antes',
    type: 'follow_up',
    language: 'spanish',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_website', 'no_crm'],
    opening: 'Hola [nombre], soy Eugene de COS Studios. Hablamos hace unos días sobre el sistema/sitio web para tu negocio.',
    problem_hook: 'Solo quería hacer seguimiento para ver si tuviste oportunidad de revisar la información que envié.',
    value_prop: 'He trabajado con varios negocios similares recientemente y los resultados han sido sólidos. Me encantaría mostrarte qué es posible para ti específicamente.',
    cta: '¿Tienes 10 minutos esta semana para una llamada rápida?',
    objections: [
      { trigger: 'no vi la información', response: 'Sin problema — te la reenvío ahora mismo. ¿Cuál es el mejor WhatsApp o email?' },
      { trigger: 'todavía pensando', response: 'Por supuesto — ¿qué preguntas puedo responder para ayudarte a decidir?' },
      { trigger: 'muy ocupado', response: 'Lo entiendo totalmente — es exactamente por eso que este sistema vale 10 minutos. Te ahorra tiempo cada semana.' },
    ],
  },
  {
    name: 'Cierre — Listo para Avanzar',
    type: 'closing',
    language: 'spanish',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_website', 'no_crm'],
    opening: 'Hola [nombre], soy Eugene. Hago seguimiento de la propuesta que envié.',
    problem_hook: 'Sé que lo estabas considerando — y honestamente, cada semana sin el sistema son clientes potenciales yendo a la competencia.',
    value_prop: 'Todo lo que discutimos está incluido — la construcción, la configuración, y estaré disponible para soporte después. Me encargo de todo de principio a fin.',
    cta: '¿Estás listo para comenzar esta semana? Puedo tener todo en marcha en 24 horas de tu confirmación.',
    objections: [
      { trigger: 'necesito más tiempo', response: 'Completamente válido — ¿qué específicamente te detiene? Abordémoslo ahora mismo.' },
      { trigger: 'muy caro', response: 'Hablemos de eso — ¿es el monto total o el momento? Puede haber una forma de estructurarlo mejor para ti.' },
      { trigger: 'no estoy listo', response: 'Lo respeto — ¿cuándo crees que estarás listo? Quiero asegurarme de reservar tu lugar.' },
    ],
  },
  {
    name: 'Objeción de Precio',
    type: 'objection',
    language: 'spanish',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_website', 'no_crm'],
    opening: 'Lo entiendo completamente — el presupuesto siempre es una consideración real y lo respeto.',
    problem_hook: 'Pero la pregunta real no es cuánto cuesta — es cuánto te cuesta NO tenerlo. Cada mes sin sitio web o sistema son trabajos yendo a la competencia.',
    value_prop: 'Mi precio está estructurado para que los primeros 1-2 trabajos extra que obtengas paguen toda la inversión. Después de eso es ganancia pura. También ofrezco opciones de pago flexibles.',
    cta: '¿Puedo mostrarte los números para que puedas tomar una decisión completamente informada?',
    objections: [
      { trigger: 'todavía muy caro', response: '¿Qué presupuesto funcionaría para ti? Dame un número y veamos si podemos estructurar algo.' },
      { trigger: 'no vale la pena', response: 'Justo — ¿qué te haría valer la pena? ¿Qué resultado necesitarías ver?' },
      { trigger: 'quizás después', response: '¿Cuándo específicamente? Lo pregunto porque los negocios que esperan generalmente pierden más — su competencia sigue moviéndose.' },
    ],
  },
  {
    name: 'Bienvenida — Cliente Nuevo',
    type: 'closing',
    language: 'spanish',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_website', 'no_crm'],
    opening: '¡Hola [nombre]! ¡Bienvenido a la familia COS Studios! 🎉 Estoy muy contento de que hayas decidido avanzar.',
    problem_hook: 'Ahora vamos a construir algo que realmente cambiará cómo opera tu negocio.',
    value_prop: 'El siguiente paso es una llamada de descubrimiento de 30 minutos donde hablamos sobre cómo funciona tu negocio exactamente. Eso asegura que lo que construimos sea perfecto para ti.',
    cta: '¿Qué día y hora funciona para ti esta semana? Soy flexible.',
    objections: [],
  },
  {
    name: 'Seguimiento — Sin Respuesta',
    type: 'follow_up',
    language: 'spanish',
    industry_tags: ['plumber', 'electrician', 'hvac', 'pest control', 'landscaping', 'cleaning', 'restaurant', 'salon', 'barbershop', 'gym'],
    problem_tags: ['no_website', 'no_crm', 'manual_processes'],
    opening: 'Hola [nombre], soy Eugene de COS Studios. Intenté contactarte la semana pasada sobre algo que creo ayudaría a tu negocio.',
    problem_hook: 'Construyo sitios web y sistemas para negocios como el tuyo — muchos están perdiendo clientes simplemente porque son difíciles de encontrar en línea o no tienen sistema.',
    value_prop: 'Lo mantengo simple, asequible y me encargo de todo de principio a fin. No necesitas saber de tecnología.',
    cta: 'Si esto es relevante, llámame al [tu número] o lo intentaré de nuevo más tarde esta semana.',
    objections: [
      { trigger: 'no me interesa', response: 'Sin problema — ¿qué parte no es relevante para tu negocio?' },
      { trigger: 'ya tengo algo', response: 'Genial saberlo — ¿qué estás usando para tu sitio web y gestión de clientes?' },
    ],
  },
]

async function insertAll() {
  for (const s of SEED_SCRIPTS) {
    await db.query(
      `INSERT INTO scripts (
        name, type, language, industry_tags, problem_tags,
        opening, problem_hook, value_prop, cta,
        objections, is_active
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, true
      )`,
      [
        s.name,
        s.type,
        s.language || 'english',
        s.industry_tags,
        s.problem_tags,
        s.opening,
        s.problem_hook,
        s.value_prop,
        s.cta,
        JSON.stringify(s.objections),
      ],
    )
  }
}

let seedPromise = null

export function seedScriptsIfEmpty() {
  if (!db) return Promise.resolve(false)
  if (seedPromise) return seedPromise

  seedPromise = (async () => {
    try {
      await db.query(
        'CREATE TABLE IF NOT EXISTS app_meta (key text PRIMARY KEY, value text)',
      )

      const versionRows = await db.query(
        `SELECT value FROM app_meta WHERE key = 'scripts_library_version'`,
      )
      const currentVersion = versionRows?.[0]?.value || null

      if (currentVersion === SCRIPTS_LIBRARY_VERSION) {
        const countRows = await db.query('SELECT COUNT(*)::int AS count FROM scripts')
        if ((countRows?.[0]?.count ?? 0) > 0) return false
        await insertAll()
        return true
      }

      await db.query('DELETE FROM scripts')
      await insertAll()
      await db.query(
        `INSERT INTO app_meta (key, value)
         VALUES ('scripts_library_version', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [SCRIPTS_LIBRARY_VERSION],
      )
      return true
    } catch (err) {
      console.error('seedScriptsIfEmpty failed', err)
      seedPromise = null
      return false
    }
  })()

  return seedPromise
}
