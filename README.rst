ssh-fu: ssh tunneling goodies for sites with kerberos bastion gateways
======================================================================

Introduction
------------

This GIT repository contains instructions and tools for easier tunneling into
sites with SSH bastion gateways with kerberos authentication, such as CERN and
Fermilab. It includes web browser proxy configuration to automatically pick an
appropriate tunnel when accessing sites which have been protected by site and
system firewalls.

These recipes has been tested on OS X Snow Leopard (10.6.8) and Lion (10.7.2),
and with Ubuntu Linux, both on-site and off-site between CERN, Fermilab, and
CIEMAT. In particular it is assumed you have laptop or desktop which may move
off-site at times, and which you want to use to connect to protected systems.

Pre-requisites
--------------

You are expected to have a kerberos account at all destination sites. The
specific examples assume you have kerberos accounts at CERN and FNAL, but
you can adjust the examples to work for almost any site.  At CERN you need
to have your AFS account enabled on lxvoadm.cern.ch.  Request your virtual
organisation contact (VOC) to do so.

Overview of the configuration
-----------------------------

There are several components to the configuration. You do not have to set all
of these up, but the most convenient operation comes from using the entire set.

* Local kerberos setup
* SSH proxy wrapper script which acquires and switches between kerberos tokens
* SSH client configuration
* Web browser SOCKS5 tunneling configuration
* Autossh to automatically rebuild tunnels.

Setting up kerberos
-------------------

Make sure you have set up kerberos adequately on your local system.  You can
use something like ``krb5.conf.direct`` as your ``/etc/krb5.conf`` if you are
using kerberos against CERN or FNAL.

If you are using OS X and MacPorts SSH, you have to rebuild your SSH with the
patches from https://trac.macports.org/ticket/27250; otherwise several kerberos
features won't work at all.  Provided those patches are installed, the MacPorts
SSH is actually quite a bit nicer than the system one.  Install the modified
SSH like this::

  HERE=$PWD                # location of this git checkout
  mkdir -p ~/Dev/MacPorts  # for example, this is your modified ports
  rsync -av /opt/local/var/macports/sources/rsync.macports.org/release/ports/net/openssh/ \
    ~/Dev/MacPorts/openssh/
  cd Dev/MacPorts/openssh
  patch < $HERE/Portfile.patch
  wget --no-check -O files/openssh-5.9p1-gsskex-all-20110920.patch \
    https://trac.macports.org/raw-attachment/ticket/27250/0001-GSS-key-exchange-patch.patch
  wget --no-check -O files/apple-keychain.patch \
    https://trac.macports.org/raw-attachment/ticket/27250/0002-Apple-keychain-integration-other-changes.patch

  sudo port uninstall --follow-dependents openssh
  sudo port install +gsskex

SSH proxy wrapper
-----------------

You'll find here a ``proxy-ssh`` wrapper script to be used as ``ProxyCommand``
in your ``~/.ssh/config`` for passing through kerberos bastion gateways.  It
acquires a kerberos principal for your destination site automatically.  On OS
X it will prompt you with a graphical dialog, on linux in the terminal where
you issue the ssh command.  It automatically renews the principal whenever
less than two hours of validity are left at the time you ssh.

The script automatically juggles several principals, you can be simultaneously
logged into several kerberos realms.  Other than the kerberos functionality it
is fully command line compatible with normal SSH.  You should not need to
change this script, so if it doesn't handle your situation for some reason,
please consider feeding back your changes.

SSH client configuration
------------------------

**If you are configuring access to CERN, do not enable ForwardAgent with
lxplus.cern.ch, and do not use lxplus.cern.ch as a gateway to other
(vocmsNNN.cern.ch) hosts.  Get an account on lxvoadm.cern.ch instead and
use it as your gateway.**

You'll find here ``ssh_config`` with an example SSH configuration.  Copy the
relevant contents adapted to your ``~/.ssh/config``.  If you want, you can
change the ports for ``DynamicForward``; it doesn't matter much which ones
you use as long as they are not used by anyone else on your local system.
(Beware copying this SSH configuration to multi-user machines.  You normally
use this SSH configuration only on your laptop or desktop, not say in your
CERN AFS home directory.)

You should normally define one ``DynamicForward`` per site, for general tunnel
configuration to web sites that are blocked by *site* firewall, but not by the
host firewalls.  Then add a ``Host``-specific ``DynamicForward`` for each *host*
which has host firewall blocking access to the web servers running on that host,
i.e. you can access the servers only from the host itself.

This way, whenever you SSH to any host at the site, you will automatically get
the site tunnel created and can access the first class of web servers.  In
addition you ssh to each of the individually firewalled hosts to gain access
to their protected web servers.

If your local user account is different than your kerberos principal at the
destination sites, add ``-P you@SITE.CC`` to your proxy-ssh options in your
``~/.ssh/config`` in the next step.  Also if you didn't put ``proxy-ssh`` in
your ``$PATH``, then use the full path to it in ``~/.ssh/config``. For
example if you put ``proxy-ssh`` to ``~/stuff``, and your CERN AFS account
is ``foo``, then you'd change the CERN ``ProxyCommand`` to::

  ProxyCommand ~/stuff/proxy-ssh -P foo@CERN.CH lxvoadm5.cern.ch /usr/bin/nc %h %p

Once you have set up your ``~/.ssh/config``, you can ssh to hosts inside the
firewall *directly, without going through the bastions manually.* For example
you can just do ``ssh vocmsNNN.cern.ch`` from anywhere.  This will internally
create first a SSH connection to the bastion host (lxvoadm.cern.ch), acquiring
a kerberos token if necessary, and uses netcat to create a tunnel to the
target host.

This SSH configuration uses ``ControlMaster``, which multiplexes all SSH
connections over the same connection, with ``ControlPersist`` to have the
multiplexing linger about 15 seconds after the last connection closes.  This
speeds up connection times considerably if you are opening sessions in several
windows or in quick succession.  Some versions of SSH handle multiplexing
poorly, so you may want to turn this off.  On OS X the MacPorts SSH with
the patches mentioned above works very well.

The configuration uses ``ServerAliveInterval``, which is useful in unstable
networks and especially with autossh as explained below.

Web browser SOCKS5 tunneling configuration
------------------------------------------

Once your SSH is set up to create dynamic forwards, set up your browser to
use SOCKS5 tunnels.  You'll find here a ``proxy.pac`` file you can put on a
web space you control, or in your home directory; the latter is preferred.
The following assumes you copy the file to ``~/.proxy.pac``.  Once you've
copied the file, make sure SOCKS5 port numbers match ``DynamicForward``
ports in your ``~/.ssh/config`` -- including whenever you add new SSH port
forwarding rules.  The example files match, so just remember to update both
files whenever you make changes.

Firefox
^^^^^^^

In Preferences / Advanced / Network, enable "Automatic proxy configuration
URL", and enter ``file:///users/you/.proxy.pac`` (on mac, replace *you* with
your account name) or ``file:///home/you/.proxy.pac`` (on linux, likewise).
If you put the file on a web site, use a ``http:`` URL instead.

Firefox with FoxyProxy
^^^^^^^^^^^^^^^^^^^^^^

If you use FoxyProxy with Firefox, instead of the previous go to FoxyProxy
configuration panel, select "Add new proxy" called "PAC", then under "Proxy
details" select "Automatic proxy configuration" and use the URL as above.
In "Select Mode" choose "Use proxy 'PAC' for all URLs".

Safari and Chrome (OS X)
^^^^^^^^^^^^^^^^^^^^^^^^

Go to System Preferences / Network / (Your network connection) / Advanced...
/ Proxies.  Enable "Automatic Proxy Configuration" and enter into URL the
path ``file:///users/you/.proxy.pac`` (replace *you* with your account).
Note that whenever you change the file contents, you need to change the file
path in this dialog once, then change it back -- it won't notice contents
changes otherwise.

Some people have reported that ``file:`` URLs do not work on OS X Lion, so
you must use ``http:``, i.e. put the file somewhere on web you control.
It's also possible the proxy configuration doesn't work for Safari on Lion.
On Snow Leopard Safari works just fine with proxies, and ``file:`` URL is
fine.

Using autossh to automatically rebuild tunnels
----------------------------------------------

As an added convenience, you can install `autossh
<http://www.harding.motd.ca/autossh/>`_ to automatically rebuild tunnels.
Install it, and once you are logged in, type in a window for example::

  autossh -M 0 -q -Nf vocmsNNN.cern.ch sleep 999999

This will automatically re-establish your SSH tunnels whenever your network
connectivity changes.  For all practical purposes, once you open your laptop,
your tunnels will rebuild in about 30 seconds. So usually everything is back
by the time you actually start working, with no work on your part.  And yes,
it will automatically prompt you for a new kerberos token whenever your
token is about to expire.

If you use MacPorts, you can just say ``sudo port install autossh`` to get it.
Otherwise just download and install into local tools location.

The command above uses ``-M 0`` because the ``~/.ssh/config`` is set up to
use ``ServerAliveInterval``.  You can adjust the timeout you like in your
SSH configuration to *interval* times *max-count*, according to how flakey
networks you tend to use.

What if my site firewall blocks kerberos?
-----------------------------------------

If you are doing all this on a laptop, sooner or later you will end up using
a network which blocks outbound kerberos traffic. You can work around this by
tunneling the kerberos traffic over SSH before setting up remaining tunnels.
If you would normally use kerberos configuration like ``krb5.conf.direct`` as
your ``/etc/krb5.conf``, switch to using ``krb5.conf.tunnel`` instead.  You
will likely also need to tunnel other ports such as 587 for SMTP.

There is however an added complexity: some sites only accept KDC traffic over
UDP.  The ``kdc-tunnel`` utility supplied here tunnels KDC UDP traffic over an
SSH tunnel. You would normally run it as follows; run the command in a window,
answer the password prompt, and leave it running there::

  sudo kdc-tunnel -L88:cerndc.cern.ch:88 -L587:smtp.cern.ch:587 \
    89:krb-fnal-1.fnal.gov:88 $USER@lxvoadm.cern.ch

Note that you need to ``sudo`` to ``root`` so that ssh can bind to low ports.
Accordingly ssh needs to be given the account at destination site, the above
assumes ``$USER`` is ok but you can change that as appropriate.  By default
``kdc-tunnel`` uses TCP port 18889 both locally and at destination; use the
``-p`` option to pick another port unlikely to be in use by others.

After you've run one of the above commands, launch normal SSH commands. When
it comes to acquiring kerberos tokens in ``proxy-ssh``, it should just work
normally.

To shut down the tunnel, ctrl-c the ``kdc-tunnel`` running in a terminal.
To restore your kerberos settings back to a direct connection, switch your
``/etc/krb5.conf`` back to something like ``krb5.conf.direct``.  It's likely
easiest to keep both those files in your ``/etc`` and make a symlink to which
ever you want to use at the time.
