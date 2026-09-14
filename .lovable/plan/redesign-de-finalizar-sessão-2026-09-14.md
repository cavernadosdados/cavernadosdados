# Redesign de “Finalizar Sessão”

Transformar o encerramento atual em um painel único, confiável e responsivo, seguindo a direção **Grimoire Command Center** adaptada à paleta Eclipse Esmeralda e às fontes Sora/Manrope já escolhidas.

## Experiência do mestre

- Substituir o alerta e a sequência de janelas por um painel amplo com:
  - identificação automática da próxima sessão e data;
  - resumo/relato do mestre para o Diário;
  - presença de cada aventureiro: presente, falta justificada ou no-show;
  - avaliações opcionais dos jogadores, dentro do próprio painel;
  - opções de notificação aos jogadores e envio ao Discord;
  - resumo persistente do que será registrado e uma confirmação final clara.
- Empilhar os módulos no celular, manter controles confortáveis ao toque e um rodapé de ação sempre legível.
- Usar esmeralda para seleção e progresso, ouro para hierarquia e pergaminho para leitura, sem cores avulsas fora do tema.

## Fluxo corrigido

- Usar o registro do Diário como identidade real da sessão; o número será calculado a partir das sessões já registradas, eliminando o número fixo `1`.
- Salvar encerramento, relato e presença juntos; avaliações permanecem opcionais e não impedem a conclusão.
- Remover a dependência do estado temporário `evaluation`, evitando mesas presas ou reabertura de avaliações antigas.
- Jogadores serão convidados a avaliar a sessão recém-encerrada, e “avaliar mais tarde” não bloqueará nem alterará o estado da mesa.
- Falha no Discord será informada sem desfazer os dados já salvos.

## Integridade e segurança

- Criar uma operação protegida no banco para finalizar apenas mesas pertencentes ao mestre autenticado.
- Garantir uma única avaliação por sessão, avaliador e avaliado; repetição atualizará ou será impedida de forma segura.
- Vincular presença e avaliações ao número/registro correto, incluindo campanhas com várias sessões.
- Manter as permissões baseadas na propriedade real da mesa e nos participantes aceitos.

## Implementação técnica

- Novo componente dedicado ao painel de encerramento, reutilizando `GlimerAvatar` e os controles visuais existentes.
- Ajustar `AdventurePanel` para abrir o painel, atualizar os dados relacionados e remover o ciclo sequencial frágil.
- Evoluir `session_logs` e `session_feedback` com os campos/índices necessários e uma função transacional de encerramento.
- Adaptar o diálogo de avaliação do jogador para receber a sessão real e reiniciar seu formulário corretamente entre pessoas/sessões.
- Invalidar Diário, presença, mesa e listagens após concluir.

## Validação

- Testar encerramentos consecutivos para confirmar numeração crescente e ausência de duplicatas.
- Testar saída/cancelamento, ausência de jogadores, falha do Discord e avaliação posterior.
- Verificar visual e interação em desktop e mobile, além dos testes automatizados e do build final.
