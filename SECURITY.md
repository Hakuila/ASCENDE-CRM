# Security Policy

## Checklist 

- Projeto em fase de ajustes 
- Deploy para testes isolados  :white_check_mark: <br>
- Broken Object Level Authorization(BOLA) :x: <br> Usar login básico e alternar para outro login
- Testes Dinâmicos e de Varredura- :x: Nikto e  OWASP ZAP <br>
- SQL Injection / NoSQL Injection :x: Usar queries parametrizadas e payloads <br>
- Cross-Site Scripting (XSS) :x: Injeção basica de '<script>alert(1)</script>' <br>
- Gerenciamento de Sessão: :x: HttpOnly, Secure e SameSite. <br> 

| Versão  |     DAST           |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| x.x.x   | :x:                |

## Reporting a Vulnerability

Caso encontre uma vulnerabilidade, favor entrar em contato!
gabriel.rodrigueskp72@gmail.com
