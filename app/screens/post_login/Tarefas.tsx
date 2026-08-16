import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleSlash,
  ClipboardCheck,
  Clock,
  Eye,
  User,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoTela } from '../../../components/CabecalhoTela';
import { Carregando, EstadoVazio, Etiqueta } from '../../../components/ui';
import { useSync } from '../../../contexts/SyncContext';
import {
  statusDaTarefa,
  tarefaEstaAtrasada,
  type Prioridade,
  type Tarefa,
} from '../../../database/types';
import {
  useConcluirTarefa,
  useEstoque,
  useTarefas,
  type DadosConclusao,
} from '../../../hooks/useDados';
import { cores, espacamento, fonte, raio, sombra } from '../../../theme';
import { ModalConcluirTarefa } from './tarefa_modais/ModalConcluirTarefa';

/** Os quatro grupos de trabalho do operador, na ordem de urgência. */
type Grupo = 'ATRASADAS' | 'PENDENTES' | 'EM_OBSERVACAO' | 'FINALIZADAS';

const TITULO_GRUPO: Record<Grupo, string> = {
  ATRASADAS: 'ATRASADAS',
  PENDENTES: 'PENDENTES',
  EM_OBSERVACAO: 'EM OBSERVAÇÃO',
  FINALIZADAS: 'CONCLUÍDAS E CANCELADAS',
};

const COR_BORDA: Record<Grupo, string> = {
  ATRASADAS: cores.vermelho,
  PENDENTES: cores.bordaForte,
  EM_OBSERVACAO: cores.ambar,
  FINALIZADAS: cores.verde,
};

const FUNDO_GRUPO: Record<Grupo, string> = {
  ATRASADAS: cores.vermelhoFundo,
  PENDENTES: cores.cartao,
  EM_OBSERVACAO: cores.ambarFundo,
  FINALIZADAS: cores.verdeFundo,
};

const TOM_PRIORIDADE: Record<Prioridade, 'vermelho' | 'ambar' | 'verde'> = {
  ALTA: 'vermelho',
  MEDIA: 'ambar',
  BAIXA: 'verde',
};

interface SecaoTarefas {
  grupo: Grupo;
  title: string;
  data: Tarefa[];
}

function grupoDaTarefa(tarefa: Tarefa): Grupo {
  const status = statusDaTarefa(tarefa);
  if (status === 'CONCLUIDA' || status === 'CANCELADA') return 'FINALIZADAS';
  if (status === 'EM_OBSERVACAO') return 'EM_OBSERVACAO';
  return tarefaEstaAtrasada(tarefa) ? 'ATRASADAS' : 'PENDENTES';
}

function formatarData(iso: string | null): string {
  if (!iso) return 'sem prazo';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return 'sem prazo';
  return data.toLocaleDateString('pt-BR');
}

function CartaoTarefa({
  tarefa,
  grupo,
  aoExecutar,
}: {
  tarefa: Tarefa;
  grupo: Grupo;
  aoExecutar: (tarefa: Tarefa) => void;
}) {
  const status = statusDaTarefa(tarefa);
  const finalizada = grupo === 'FINALIZADAS';
  const cancelada = status === 'CANCELADA';

  return (
    <View
      style={[
        estilos.cartao,
        { borderLeftColor: COR_BORDA[grupo], backgroundColor: FUNDO_GRUPO[grupo] },
      ]}
    >
      <View style={estilos.cartaoConteudo}>
        <Text style={estilos.tituloTarefa} numberOfLines={2}>
          {tarefa.titulo}
        </Text>
        {tarefa.descricao && (
          <Text style={estilos.descricao} numberOfLines={2}>
            {tarefa.descricao}
          </Text>
        )}

        <View style={estilos.metadados}>
          <View style={estilos.metaItem}>
            <CalendarDays size={13} color={cores.textoSuave} />
            <Text style={estilos.metaTexto}>Até {formatarData(tarefa.dataPrazo)}</Text>
          </View>
          {tarefa.nomeResponsavel && (
            <View style={estilos.metaItem}>
              <User size={13} color={cores.textoSuave} />
              <Text style={estilos.metaTexto} numberOfLines={1}>
                {tarefa.nomeResponsavel}
              </Text>
            </View>
          )}
        </View>

        <View style={estilos.etiquetas}>
          <Etiqueta texto={tarefa.prioridade} tom={TOM_PRIORIDADE[tarefa.prioridade]} />
          {tarefa.categoria && <Etiqueta texto={tarefa.categoria} tom="verde" />}
          {cancelada ? (
            <Etiqueta texto="CANCELADA" tom="cinza" />
          ) : grupo === 'ATRASADAS' ? (
            <Etiqueta texto="ATRASADA" tom="vermelho" />
          ) : grupo === 'EM_OBSERVACAO' ? (
            <Etiqueta texto="TRATADA" tom="ambar" />
          ) : grupo === 'FINALIZADAS' ? (
            <Etiqueta texto="FEITA" tom="verde" />
          ) : (
            <Etiqueta texto="PENDENTE" tom="azul" />
          )}
          {tarefa.syncStatus === 'pending' && <Etiqueta texto="No aparelho" tom="azul" />}
          {tarefa.syncStatus === 'error' && <Etiqueta texto="Erro no envio" tom="vermelho" />}
        </View>

        {tarefa.nomeCriador && (
          <Text style={estilos.criador}>Criado por: {tarefa.nomeCriador}</Text>
        )}
      </View>

      {/* Tarefas canceladas pelo gestor não são executáveis pelo operador. */}
      {!cancelada && (
        <Pressable
          onPress={() => aoExecutar(tarefa)}
          style={[
            estilos.botaoAcao,
            grupo === 'EM_OBSERVACAO' && estilos.botaoObservacao,
            finalizada && estilos.botaoConcluido,
          ]}
          accessibilityRole="button"
          accessibilityLabel={finalizada ? 'Revisar tarefa' : 'Executar tarefa'}
        >
          {grupo === 'EM_OBSERVACAO' ? (
            <Eye size={22} color="#fff" />
          ) : (
            <CheckCircle2 size={22} color={finalizada ? '#fff' : cores.verde} />
          )}
        </Pressable>
      )}
    </View>
  );
}

export default function Tarefas() {
  const { data: tarefas, isLoading, refetch } = useTarefas();
  const { data: estoque } = useEstoque();
  const { sincronizarAgora, sincronizando } = useSync();
  const concluir = useConcluirTarefa();

  const [emExecucao, setEmExecucao] = useState<Tarefa | null>(null);

  const secoes = useMemo<SecaoTarefas[]>(() => {
    const lista = tarefas ?? [];
    const ordem: Grupo[] = ['ATRASADAS', 'PENDENTES', 'EM_OBSERVACAO', 'FINALIZADAS'];

    return ordem
      .map((grupo) => ({
        grupo,
        title: TITULO_GRUPO[grupo],
        data: lista.filter((t) => grupoDaTarefa(t) === grupo),
      }))
      .filter((secao) => secao.data.length > 0);
  }, [tarefas]);

  const confirmar = async (dados: DadosConclusao, emObservacao: boolean) => {
    if (!emExecucao) return;
    await concluir.mutateAsync({ tarefa: emExecucao, dados, emObservacao });
    setEmExecucao(null);
  };

  const pendentesAbertas = (tarefas ?? []).filter(
    (t) => grupoDaTarefa(t) === 'PENDENTES' || grupoDaTarefa(t) === 'ATRASADAS'
  ).length;

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <CabecalhoTela
        titulo="Centro de Atividades"
        subtitulo={
          pendentesAbertas > 0
            ? `${pendentesAbertas} ${pendentesAbertas === 1 ? 'demanda aberta' : 'demandas abertas'} para você.`
            : 'Acompanhe e execute as demandas da fazenda.'
        }
      />

      <SectionList<Tarefa, SecaoTarefas>
        sections={secoes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={estilos.conteudo}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={sincronizando}
            onRefresh={() => {
              void sincronizarAgora();
              void refetch();
            }}
            colors={[cores.verde]}
            tintColor={cores.verde}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={estilos.cabecalhoSecao}>
            {section.grupo === 'ATRASADAS' && <AlertTriangle size={14} color={cores.vermelho} />}
            {section.grupo === 'EM_OBSERVACAO' && <Clock size={14} color={cores.ambar} />}
            {section.grupo === 'FINALIZADAS' && <CircleSlash size={14} color={cores.verde} />}
            <Text
              style={[
                estilos.tituloSecao,
                section.grupo === 'ATRASADAS' && { color: cores.vermelho },
                section.grupo === 'EM_OBSERVACAO' && { color: cores.ambar },
                section.grupo === 'FINALIZADAS' && { color: cores.verde },
              ]}
            >
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item, section }) => (
          <CartaoTarefa tarefa={item} grupo={section.grupo} aoExecutar={setEmExecucao} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: espacamento.sm }} />}
        ListEmptyComponent={
          isLoading ? (
            <Carregando />
          ) : (
            <EstadoVazio
              icone={<ClipboardCheck size={40} color={cores.textoFraco} />}
              titulo="Nenhuma tarefa atribuída"
              descricao="As tarefas são criadas pelo gestor no sistema web. Puxe a tela para baixo para sincronizar."
            />
          )
        }
      />

      <ModalConcluirTarefa
        tarefa={emExecucao}
        itensEstoque={estoque ?? []}
        salvando={concluir.isPending}
        aoFechar={() => setEmExecucao(null)}
        aoConfirmar={confirmar}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    paddingHorizontal: espacamento.lg,
    paddingBottom: 110,
  },
  cabecalhoSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: espacamento.lg,
    marginBottom: espacamento.sm,
  },
  tituloSecao: {
    fontSize: fonte.minusculo,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: cores.textoSuave,
  },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento.md,
    borderRadius: raio.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: espacamento.md,
    ...sombra.cartao,
  },
  cartaoConteudo: {
    flex: 1,
    gap: 4,
  },
  tituloTarefa: {
    fontSize: fonte.corpo,
    fontWeight: '700',
    color: cores.texto,
    textTransform: 'uppercase',
  },
  descricao: {
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
  },
  metadados: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento.md,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaTexto: {
    fontSize: fonte.minusculo,
    color: cores.textoSuave,
  },
  etiquetas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  criador: {
    fontSize: fonte.minusculo - 1,
    color: cores.textoFraco,
    marginTop: 2,
  },
  botaoAcao: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.cartao,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoObservacao: {
    backgroundColor: cores.ambar,
    borderColor: cores.ambar,
  },
  botaoConcluido: {
    backgroundColor: cores.verde,
    borderColor: cores.verde,
  },
});
