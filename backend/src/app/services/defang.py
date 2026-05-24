"""Safe, lossy URL/IOC defanging.

We defang anything that *looks* live (URLs, bare domains, emails) so a
malicious indicator can never be rendered as a clickable link inside the
product or copy-pasted by mistake. Lossy by design — we accept rare false
positives (e.g. defanging an example.com mention in a benign tutorial) in
exchange for a guarantee that nothing reaches the UI un-defanged.
"""

from __future__ import annotations

import re

# Order matters — defang scheme first, then dots inside hostnames.
_SCHEME_RE = re.compile(r"\bhttps?://", flags=re.IGNORECASE)
_HOSTPATH_RE = re.compile(
    r"(hxxps?://)([^/\s\"'<>]+)", flags=re.IGNORECASE,
)
_BARE_DOMAIN_RE = re.compile(
    # Bare-looking domain not preceded by `://`. Conservative — at least one
    # dot and a 2-6 char TLD.
    r"(?<![/\w@])([\w-]+(?:\.[\w-]+)+\.[a-z]{2,6})\b",
    flags=re.IGNORECASE,
)
_EMAIL_RE = re.compile(r"([\w.+-]+)@([\w-]+(?:\.[\w-]+)+)")


def _replace_dots(host: str) -> str:
    return host.replace(".", "[.]")


def defang(text: str | None) -> str:
    """Return ``text`` with URLs / domains / emails defanged.

    Replacements applied:
    - ``http://`` → ``hxxp://``
    - ``https://`` → ``hxxps://``
    - dots inside hostnames → ``[.]``
    - email ``@`` → ``[@]``
    """
    if not text:
        return ""
    out = _SCHEME_RE.sub(
        lambda m: m.group(0).lower().replace("http", "hxxp"),
        text,
    )

    def _defang_host(m: re.Match[str]) -> str:
        scheme, host_rest = m.group(1), m.group(2)
        return scheme + _replace_dots(host_rest)

    out = _HOSTPATH_RE.sub(_defang_host, out)

    # Bare domains (no scheme)
    out = _BARE_DOMAIN_RE.sub(lambda m: _replace_dots(m.group(1)), out)

    # Emails
    out = _EMAIL_RE.sub(
        lambda m: f"{m.group(1)}[@]{_replace_dots(m.group(2))}",
        out,
    )

    return out
