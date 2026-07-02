export type CultureHubItem = {
  title: string;
  body?: string;
  bullets?: string[];
};

export type CultureHubColumn = {
  heading: string;
  items: CultureHubItem[];
};

export type CultureHubContent = {
  title: string;
  columns: CultureHubColumn[];
};

export const CULTURE_HUB_CONTENT: CultureHubContent = {
  title: "MEAVO Company Culture",
  columns: [
    {
      heading: "What you can expect from MEAVO",
      items: [
        {
          title: "Autonomy",
          body: "make your own decisions, no micro management.",
        },
        {
          title: "Flexibility",
          body: "work when you want, where you want, as long as it doesn't impact clients or your performance.",
        },
        {
          title: "Trust",
          body: "goes in line with flexibility and remote working, we trust you that things get done.",
        },
        {
          title: "Transparency",
          body: "we'll share the state of the business, plans going forward, problems we're facing, etc.",
        },
        {
          title: "Support",
          body: "in good and bad times, we'll try to support you + fair compensation.",
        },
      ],
    },
    {
      heading: "What we expect from you (and ourselves)",
      items: [
        {
          title: "Getting shit done",
          body: "you can work when you want and where you want, but stuff needs to get done. You need to be self-driven.",
        },
        {
          title: "Honesty & transparency",
          bullets: [
            "Admit to mistakes (we all make them, it's good to step out of your comfort zone), fix them & learn from them",
            "FEEDBACK: Tell us when you're unhappy or something bothers you",
            "Tell us when you're away (e.g. leave country)",
            "Tell us about other work / side ventures",
            "Don't lie",
          ],
        },
        {
          title: "Respect",
          body: "Being respectful and courteous towards colleagues, clients and suppliers.",
          bullets: [
            "Think before you press Enter (using the right tone?)",
            "How will the recipient feel? Using the right Slack channel (public vs. private 1-1)? Should you even use Slack?",
            "Annoyed? Pick up the phone!",
          ],
        },
        {
          title: "Helpful",
          body: "Support your colleagues.",
        },
      ],
    },
  ],
};
