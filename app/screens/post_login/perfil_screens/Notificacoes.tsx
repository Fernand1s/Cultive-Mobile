import { AlertTriangle, BellOff, CheckCircle2, Clock, UploadCloud } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TelaInterna } from '../../../../components/TelaInterna';
import { Botao, Cartao, EstadoVazio, Etiqueta } from '../../../../components/ui';
import { useSync } from '../../../../contexts/SyncContext';
import { outboxRepo } from '../../../../database/repositories/outboxRepo';
import type { ItemOutbox } from '../../../../database/types';
import { cores, espacamento, fonte } from '../../../../theme';

/**
 * Central de avisos do modo offline: mostra exatamente o que foi registrado no
 * campo e ainda não chegou ao sistema web, com o motivo de eventuais falhas.
 */

const DESCRICAO_OPERACAO: Record<string, string> = {
  'tarefa.concluir': 'Conclusão de tarefa',
  'tarefa.observacao': 'Tarefa em observação',
  'estoque.criar': 'Novo item de estoque',
  'estoque.atualizar': 'Edição de item do estoque',
  'estoque.excluir': 'Exclusão de item do estoque',
  'cultivo.status': 'Atualização de cultivo',
};

export default function Notificacoes() {
  const { pendentes, online, sincronizando, sincronizarAgora, ultimaSync } = useSync();
  const [fila, setFila] = useState<ItemOutbox[]>([]);

  const carregar = useCallback(async () => {
    setFila(await outboxRepo.pendentes());
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar, pendentes]);

  return (
    <TelaInterna titulo="Notificações" subtitulo="O que está esperando para subir ao sistema.">
      <Cartao style={estilos.resumo}>
        {pendentes === 0 ? (
          <CheckCircle2 size={22} color={cores.verde} />
        ) : (
          <UploadCloud size={22} color={cores.azul} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={estilos.resumoTitulo}>
            {pendentes === 0
              ? 'Tudo sincronizado'
              : `${pendentes} ${pendentes === 1 ? 'registro aguardando' : 'registros aguardando'}`}
          </Text>
          <Text style={estilos.resumoDescricao}>
            {ultimaSync
              ? `Última sincronização em ${new Date(ultimaSync).toLocaleString('pt-BR')}`
              : 'Este aparelho ainda não sincronizou.'}
          </Text>
        </View>
      </Cartao>

      {pendentes > 0 && (
        <Botao
          titulo={sincronizando ? 'Enviando…' : 'Enviar agora'}
          icone={<UploadCloud size={16} color="#fff" />}
          aoPressionar={() => void sincronizarAgora()}
          desabilitado={!online || sincronizando}
        />
      )}

      {fila.length === 0 ? (
        <EstadoVazio
          icone={<BellOff size={36} color={cores.textoFraco} />}
          titulo="Nenhum aviso"
          descricao="Quando você registrar algo sem internet, o item aparece aqui até ser enviado."
        />
      ) : (
        fila.map((item) => {
          const comFalha = item.tentativas > 0;
          return (
            <Cartao key={item.id} style={estilos.item}>
              <View style={estilos.itemCabecalho}>
                <Text style={estilos.itemTitulo}>
                  {DESCRICAO_OPERACAO[item.operacao] ?? item.operacao}
                </Text>
                <Etiqueta
                  texto={comFalha ? `${item.tentativas} tentativa(s)` : 'Na fila'}
                  tom={comFalha ? 'ambar' : 'azul'}
                  icone={
                    comFalha ? (
                      <AlertTriangle size={12} color="#B45309" />
                    ) : (
                      <Clock size={12} color={cores.azul} />
                    )
                  }
                />
              </View>
              <Text style={estilos.itemMeta}>
                Registro #{item.entidadeId} · {new Date(item.criadoEm).toLocaleString('pt-BR')}
              </Text>
              {item.ultimoErro && <Text style={estilos.itemErro}>{item.ultimoErro}</Text>}
            </Cartao>
          );
        })
      )}
    </TelaInterna>
  );
}

const estilos = StyleSheet.create({
  resumo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
  },
  resumoTitulo: {
    fontSize: fonte.corpo,
    fontWeight: '700',
    color: cores.texto,
  },
  resumoDescricao: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
    marginTop: 2,
  },
  item: {
    gap: 4,
  },
  itemCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento.sm,
  },
  itemTitulo: {
    flex: 1,
    fontSize: fonte.corpo,
    fontWeight: '600',
    color: cores.texto,
  },
  itemMeta: {
    fontSize: fonte.minusculo,
    color: cores.textoFraco,
  },
  itemErro: {
    fontSize: fonte.minusculo,
    color: cores.vermelho,
    marginTop: 2,
  },
});
