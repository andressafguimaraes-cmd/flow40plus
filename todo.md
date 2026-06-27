# Flow40+ - TODO List

## Fase 1: Banco de Dados
- [x] Criar tabela `morningCheckIns` para armazenar check-ups diários
- [x] Criar tabela `tasks` para armazenar tarefas decompostas
- [x] Criar tabela `taskDecompositions` para histórico de decomposições
- [x] Criar tabela `practices` para biblioteca de micro-práticas
- [x] Criar tabela `userPracticeProgress` para rastrear práticas concluídas

## Fase 2: Backend (tRPC)
- [x] Implementar rota `checkIns.create` para salvar check-up matinal
- [x] Implementar rota `checkIns.getWeekly` para obter estatísticas semanais
- [x] Implementar rota `tasks.decompose` para decompor tarefas com IA
- [x] Implementar rota `tasks.list` para listar tarefas do usuário
- [x] Implementar rota `tasks.update` para atualizar status de tarefas
- [x] Implementar rota `practices.getAll` para obter biblioteca de práticas
- [x] Implementar rota `practices.logProgress` para registrar conclusão de práticas

## Fase 3: Frontend - Autenticação e Layout
- [ ] Criar layout base com navegação (Check-up, Dashboard, Tarefas, Práticas, Perfil)
- [ ] Implementar proteção de rotas (apenas usuárias autenticadas)
- [ ] Criar componente de logout

## Fase 4: Frontend - Check-up Matinal
- [x] Criar tela de Check-up com sliders (Sono, Energia, Clareza)
- [x] Implementar persistência de check-up no banco de dados
- [x] Adicionar validação e feedback visual
- [ ] Criar modal de confirmação após check-up

## Fase 5: Frontend - Dashboard
- [ ] Exibir recomendações personalizadas baseadas no check-up
- [ ] Exibir card de estatísticas semanais (médias de Sono, Energia, Clareza)
- [ ] Exibir status do próximo lembrete
- [ ] Criar botão flutuante para capturar nova tarefa

## Fase 6: Frontend - Decomposição de Tarefas
- [ ] Criar modal/tela para entrada de tarefa
- [ ] Integrar com IA para decomposição
- [ ] Exibir micro-passos com tempo estimado e dificuldade
- [ ] Permitir salvar decomposição ou descartar

## Fase 7: Frontend - Lista de Tarefas
- [ ] Exibir lista de tarefas decompostas
- [ ] Implementar checkboxes para marcar micro-passos como concluídos
- [ ] Exibir progresso geral da tarefa
- [ ] Permitir visualizar histórico de decomposições

## Fase 8: Frontend - Biblioteca de Práticas
- [ ] Criar 9 práticas curadas (3 em Foco, 3 em Alívio, 3 em Inspiração)
- [ ] Implementar navegação entre categorias
- [ ] Exibir descrição e duração de cada prática
- [ ] Permitir marcar prática como concluída

## Fase 9: Identidade Visual
- [ ] Aplicar paleta de cores (Azul Marinho #003366, Âmbar #E67E22, Bege Creme #FDF5E6)
- [ ] Importar tipografia (Montserrat e Inter)
- [ ] Aplicar estilos globais com Tailwind
- [ ] Garantir layout responsivo mobile-first

## Fase 10: Testes e Publicação
- [ ] Testar fluxo completo de autenticação
- [ ] Testar check-up e persistência
- [ ] Testar decomposição com IA
- [ ] Testar lista de tarefas
- [ ] Testar biblioteca de práticas
- [ ] Publicar e gerar link permanente

---

## Notas Importantes
- Todas as funcionalidades devem estar dentro do contexto de usuária autenticada
- Nenhum dado deve ser acessível sem login
- A IA deve sempre retornar tempo estimado e dificuldade para cada micro-passo
- Biblioteca deve ter exatamente 9 práticas
