# EkshitaScreen — Local Area Network (LAN) Configuration

EkshitaScreen is engineered to operate strictly over your Local Area Network without relying on public cloud infrastructure or third-party SaaS services.

---

## 1. Network Architecture

```
                       [ Local Wi-Fi / Switch Router ]
                                      |
         +----------------------------+----------------------------+
         |                                                         |
[ EkshitaScreen Backend Server ]                          [ Android TV Players ]
IP: 192.168.1.200                                         IP: 192.168.1.101 (Lobby)
Ports: 3000 (Web/REST), WebSocket (ws://)                 IP: 192.168.1.102 (Cafeteria)
Storage: Local Disk                                       Storage: Device Internal Flash
```

---

## 2. Static IP Recommendation

To prevent connection drops during router lease renewals, assign static IP addresses (DHCP reservation) to:
1. The **Backend Server / PC** running EkshitaScreen (e.g. `192.168.1.200`).
2. The **Android TV displays** (e.g. `192.168.1.100 - 192.168.1.150`).

---

## 3. Router & AP Isolation Check

**Important**: Ensure **AP Isolation** (Client Isolation) is **DISABLED** on your Wi-Fi router.
- When enabled, AP isolation prevents wireless devices (such as Android TVs) from communicating directly with local servers on the same subnet.
- Access your router administration portal > Wireless Settings > Advanced > Disable "AP Isolation" or "Station Separation".

---

## 4. Cleartext HTTP Policy

Because Phase 1 operates on a private, air-gapped local intranet, standard HTTP cleartext traffic is permitted for configured local LAN endpoints:
```xml
<!-- AndroidManifest.xml -->
<application
    android:usesCleartextTraffic="true"
    ...>
```
If HTTPS is required for your enterprise security policy, you can terminate TLS with a local reverse proxy (Nginx or Caddy) using an internal root CA certificate.

---

## 5. Offline Operation Verification

Once an Android TV has synchronized its active playlist:
1. Disconnect Ethernet or turn off Wi-Fi on the TV.
2. The slideshow continues seamlessly in a loop without interruption or warning banners.
3. Power cycle the TV without network: EkshitaScreen restarts from internal flash memory cache and continues playing immediately.
4. When network is restored, the TV silently re-establishes WebSocket connectivity and checks for content updates.
