function FindProxyForURL(url, host)
{
  if (isInNet(host, "192.168.0.0", "255.255.0.0")
      || isInNet(host, "10.0.0.0", "255.0.0.0")
      || host == "localhost"
      || host == "127.0.0.1")
    return "DIRECT";

  else if (shExpMatch(host, "vocms144.cern.ch"))
    return "SOCKS5 127.0.0.1:47171";

  else if (shExpMatch(host, "vocms202.cern.ch"))
    return "SOCKS5 127.0.0.1:47172";

  else if (shExpMatch(host, "vocms201.cern.ch"))
    return "SOCKS5 127.0.0.1:47173";

  else if (shExpMatch(host, "cmsweb-*.cern.ch")
           || shExpMatch(host, "vocms*.cern.ch")
           || shExpMatch(host, "dmwm*.cern.ch")
           || shExpMatch(host, "cmsdaq0.cern.ch")
           || shExpMatch(host, "reqmon*.cern.ch"))
    return "SOCKS5 127.0.0.1:47170";

  else if (shExpMatch(host, "cmssrv98.fnal.gov"))
    return "SOCKS5 127.0.0.1:47271";

  else if (shExpMatch(host, "cmssrv112.fnal.gov"))
    return "SOCKS5 127.0.0.1:47272";

  else if (shExpMatch(host, "cmssrv73.fnal.gov"))
    return "SOCKS5 127.0.0.1:47273";

  else if (shExpMatch(host, "cmssrv94.fnal.gov"))
    return "SOCKS5 127.0.0.1:47274";

  return "DIRECT";
}
