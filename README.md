# Shirish2004.github.io

Personal research portfolio of Shirish Shekhar Jha, served by GitHub Pages at <https://shirish2004.github.io/>.

Plain HTML, CSS and JavaScript modules. No build step, no dependencies.

## Update the content

Everything on the page comes from [`js/data.js`](js/data.js):

| To change | Edit |
|---|---|
| Name, emails, links, Google Scholar URL | `profile` |
| Hero text for the Hiring / Research toggle, section order | `audiences` |
| Projects (status `now`, `next`, `recent`, `past`), images, links | `projects` |
| Papers | `publications` |
| Past / Now / Next column | `trajectory` |
| Jobs, degrees, schools | `experience`, `schools` |

Project `skills` must use the ids in `skillGroups`; the skill chart and filters are computed from them.

**CV download:** put a PDF (without your phone number) at `assets/cv/Shirish_Shekhar_Jha_CV.pdf`. The button appears automatically once the file is there.

**Google Scholar:** paste your profile URL into `profile.links.scholar`.

## Preview locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish

Push to `main`. In the repository's *Settings → Pages*, set the source to *Deploy from a branch*, branch `main`, folder `/ (root)`.
