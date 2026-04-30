# Plano em 4 blocos (sem foco visual)

Este documento reorganiza os requisitos em **4 blocos principais**, removendo itens puramente visuais para facilitar execução por fases.

## Bloco 1 — Dados da coleção e regras de negócio

### Objetivo
Fortalecer consistência dos dados, automações e experiência básica da coleção.

### Escopo
- Salvar até **3 slots de ordem de organização de plataformas** nos filtros da dashboard, persistidos por usuário.
- Revisar regras de raridade:
  - valor padrão = “não definida”;
  - “não definida” deve gerar gatilho para “Completar Depois”.
- Revisar regras de status de jogo:
  - status “não definido” também deve gerar gatilho para “Completar Depois”.
- Em detalhes de item (jogo), adicionar campo editável de **franquia** abaixo do nome.
- Ajustar regra de hype:
  - remover dependência do texto “Escala de Hype…”;
  - após lançamento, hype migra para nota e hype volta para vazio.
- Implementar **review de jogo** por item de coleção, com limite de **1000 caracteres**.
- Destacar itens com review (lógica de sinalização, sem detalhar UI).

### Entregáveis técnicos
- Novos campos/colunas e validações de backend.
- Persistência por usuário (Supabase).
- Regras de gatilho para “Completar Depois”.

---

## Bloco 2 — Plataformas, catálogo interno e expansão para PC

### Objetivo
Criar base escalável para cadastro guiado de plataformas/acessórios e modelagem de PC.

### Escopo
- Criar **banco interno administrativo** (acesso restrito ao dono):
  - cadastro de plataformas e acessórios;
  - dados mínimos: nome, versão, data de lançamento, imagem;
  - busca no cadastro semelhante ao fluxo atual com IGDB.
- Definir estrutura da plataforma **Computador/PC** com subpastas:
  - Máquina;
  - Periféricos;
  - Jogos.
- Em “Máquina”, suportar dois fluxos:
  - dispositivo fechado (notebook/handheld etc.);
  - desktop modular com componentes principais + opcionais.
- Permitir registrar desktop de forma parcial (componente opcional, sem bloqueio).
- Em “Jogos (PC)”, permitir organização por loja/plataforma de compra (Steam, EA, Epic, GOG etc.).
- Criar área para itens como controladores de celular.
- Pesquisar viabilidade de base de dados externa para hardware de PC (integração futura).

### Entregáveis técnicos
- Modelo de dados para catálogo interno.
- Painel/admin de cadastro simples.
- Nova taxonomia de coleção para PC e componentes.

---

## Bloco 3 — Inteligência de produto, notificações e engajamento

### Objetivo
Transformar dados da coleção em ações úteis para retenção e recorrência.

### Escopo
- Implementar central de **Notificações** com foco inicial em:
  - dados faltantes para completar coleção;
  - lançamentos próximos;
  - sugestões baseadas em coleção/gostos/plataformas.
- Definir motor inicial de **insights inteligentes** (regras + evolução futura para recomendação).
- Idealizar e estruturar sistema de **conquistas**:
  - núcleo “platinável”;
  - trilhas novas contínuas.
- Verificar viabilidade de **notificações push** para PWA/site instalável e integração com insights.
- Planejar integração futura de calendário estilo My Game List.

### Entregáveis técnicos
- Serviço de geração de insights/notificações.
- Estrutura de eventos/ações para conquistas.
- Documento técnico de viabilidade para push notifications.

---

## Bloco 4 — Conta, perfis públicos e modelo de produto

### Objetivo
Consolidar funcionalidades de usuário, exposição social e estratégia free/assinatura.

### Escopo
- Configurações de conta:
  - aba Perfil: foto, nome de usuário, nome do legado, bio (até 100 caracteres);
  - aba Conta: e-mail, senha, exclusão de conta.
- Perfis públicos sempre visíveis com dados da coleção e filtros.
- Interações sociais limitadas a:
  - likes em reviews;
  - likes em jogos na coleção;
  - likes em perfis.
- Definir fronteira entre **FREE vs assinatura** com foco em retenção sem sobrecarga de informação.

### Entregáveis técnicos
- APIs de perfil/conta e políticas de privacidade visíveis.
- Regras de permissão para interações públicas.
- Matriz de features por plano (free/pago).

---

## Ordem sugerida de implementação
1. **Bloco 1** (consistência de dados e regras base).
2. **Bloco 2** (estrutura de catálogo e PC, que impacta cadastro futuro).
3. **Bloco 4** (conta/perfil/plano para preparar exposição e monetização).
4. **Bloco 3** (inteligência e notificações com melhor base de dados).

## Critério de corte (fora deste escopo)
Itens exclusivamente visuais (ícones, estilos, layout de cards/estante, contorno, avatar, landing page e variações gráficas) foram removidos deste plano e podem ser tratados em uma trilha de Design System/UI separada.
