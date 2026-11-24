import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bug,
  LandPlot,
  PackageSearch,
  RefreshCw,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoTela } from '../../../components/CabecalhoTela';
import { Abas, Cartao, EstadoVazio, Etiqueta, LinhaInfo } from '../../../components/ui';
import { useSync } from '../../../contexts/SyncContext';
import { useRelatorio } from '../../../hooks/useDados';
import { cores, espacamento, fonte, raio } from '../../../theme';

/**
 * Relatórios em modo consulta, alimentados pelo cache local — o operador
 * consegue conferir números no campo sem sinal. Os quatro tópicos espelham as
 * categorias equivalentes do sistema web.
 */

type TopicoRelatorio = 'PRODUCAO' | 'FITOSSANITARIO' | 'ESTOQUE' | 'OCUPACAO';

const CHAVE_RELATORIO: Record<TopicoRelatorio, string> = {
  PRODUCAO: 'produtividade',
  FITOSSANITARIO: 'incidencia-pragas',
  ESTOQUE: 'alertas-estoque',
  OCUPACAO: 'ocupacao-areas',
};

interface Produtividade {
  idCultivo: number;
  nomePlanta: string | null;
  nomeArea: string | null;
  tamanhoArea: number | null;
  quantidadeColhida: number | null;
  unidadeMedida: string | null;
  produtividadeKgHa: number | null;
  dataPlantio: string | null;
  dataEncerramento: string | null;
  statusCultivo: string | null;
  estadoPlanta: string | null;
}

interface IncidenciaPraga {
  nomePraga: string | null;
  ocorrencias: number | null;
  nivelMaisGrave: string | null;
  areaMaisAfetada: string | null;
  plantaMaisAfetada: string | null;
  ultimaOcorrencia: string | null;
}

interface AlertaEstoque {
  idEstoque: number;
  nome: string | null;
  categoria: string | null;
  subcategoria: string | null;
  quantidadeAtual: number | null;
  estoqueMinimo: number | null;
  deficit: number | null;
  situacao: string | null;
  unidadeMedida: string | null;
  validade: string | null;
}

interface OcupacaoArea {
  idArea: number;
  nomeArea: string | null;
  tamanhoArea: number | null;
  statusAtual: string | null;
  diasOcupadoTotal: number | null;
  diasOciosoTotal: number | null;
  taxaOcupacao: number | null;
  totalCultivos: number;
}

const numeroBR = (valor: number | null | undefined, casas = 1): string =>
  valor === null || valor === undefined || !Number.isFinite(valor)
    ? '—'
    : valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : data.toLocaleDateString('pt-BR');
}

/**
 * Barra proporcional — substitui os gráficos do sistema web, que dependem de
 * bibliotecas pesadas e ficam ilegíveis em tela pequena.
 */
function BarraComparativa({
  rotulo,
  valor,
  maximo,
  sufixo,
  cor = cores.verde,
}: {
  rotulo: string;
  valor: number;
  maximo: number;
  sufixo?: string;
  cor?: string;
}) {
  const proporcao = maximo > 0 ? Math.min(1, valor / maximo) : 0;
  const largura: DimensionValue = `${proporcao * 100}%`;

  return (
    <View style={estilos.barraContainer}>
      <View style={estilos.barraTopo}>
        <Text style={estilos.barraRotulo} numberOfLines={1}>
          {rotulo}
        </Text>
        <Text style={estilos.barraValor}>
          {numeroBR(valor)} {sufixo ?? ''}
        </Text>
      </View>
      <View style={estilos.barraTrilho}>
        <View style={[estilos.barraPreenchida, { width: largura, backgroundColor: cor }]} />
      </View>
    </View>
  );
}

function SemDados({ topico }: { topico: string }) {
  return (
    <EstadoVazio
      icone={<BarChart3 size={36} color={cores.textoFraco} />}
      titulo={`Sem dados de ${topico}`}
      descricao="Sincronize com o servidor para baixar os relatórios mais recentes."
    />
  );
}

// ---------------------------------------------------------------------------

function AbaProducao() {
  const { data } = useRelatorio<Produtividade[]>(CHAVE_RELATORIO.PRODUCAO);
  const registros = data?.dados ?? [];

  const porArea = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const item of registros) {
      const area = item.nomeArea ?? 'Sem área';
      mapa.set(area, (mapa.get(area) ?? 0) + (item.quantidadeColhida ?? 0));
    }
    return Array.from(mapa.entries()).map(([nome, total]) => ({ nome, total }));
  }, [registros]);

  if (registros.length === 0) return <SemDados topico="produção" />;

  const maxColheita = Math.max(...porArea.map((a) => a.total), 0);
  const maxProdutividade = Math.max(...registros.map((r) => r.produtividadeKgHa ?? 0), 0);

  return (
    <View style={estilos.conteudoAba}>
      <Cartao style={estilos.bloco}>
        <Text style={estilos.tituloBloco}>Colheita Total por Área</Text>
        {porArea.map((area) => (
          <BarraComparativa
            key={area.nome}
            rotulo={area.nome}
            valor={area.total}
            maximo={maxColheita}
            sufixo="kg"
          />
        ))}
      </Cartao>

      <Cartao style={estilos.bloco}>
        <Text style={estilos.tituloBloco}>Produtividade por Cultivo (kg/ha)</Text>
        {registros.map((item) => (
          <BarraComparativa
            key={item.idCultivo}
            rotulo={`${item.nomePlanta ?? 'Cultivo'} · ${item.nomeArea ?? '—'}`}
            valor={item.produtividadeKgHa ?? 0}
            maximo={maxProdutividade}
            sufixo="kg/ha"
            cor={cores.azul}
          />
        ))}
      </Cartao>

      <Cartao style={estilos.bloco}>
        <Text style={estilos.tituloBloco}>Detalhamento por Cultivo</Text>
        {registros.map((item) => (
          <View key={item.idCultivo} style={estilos.detalhe}>
            <Text style={estilos.detalheTitulo}>{item.nomePlanta ?? 'Cultivo'}</Text>
            <LinhaInfo rotulo="Área" valor={item.nomeArea ?? '—'} />
            <LinhaInfo
              rotulo="Colhido"
              valor={`${numeroBR(item.quantidadeColhida)} ${item.unidadeMedida ?? ''}`}
            />
            <LinhaInfo rotulo="Plantio" valor={formatarData(item.dataPlantio)} />
            <LinhaInfo rotulo="Encerramento" valor={formatarData(item.dataEncerramento)} />
          </View>
        ))}
      </Cartao>
    </View>
  );
}

function AbaFitossanitario() {
  const { data } = useRelatorio<IncidenciaPraga[]>(CHAVE_RELATORIO.FITOSSANITARIO);
  const registros = data?.dados ?? [];

  if (registros.length === 0) return <SemDados topico="ocorrências fitossanitárias" />;

  const maxOcorrencias = Math.max(...registros.map((r) => r.ocorrencias ?? 0), 0);

  return (
    <View style={estilos.conteudoAba}>
      <Cartao style={estilos.bloco}>
        <Text style={estilos.tituloBloco}>Incidência por Praga</Text>
        {registros.map((item) => (
          <BarraComparativa
            key={item.nomePraga ?? String(item.ultimaOcorrencia)}
            rotulo={item.nomePraga ?? 'Praga'}
            valor={item.ocorrencias ?? 0}
            maximo={maxOcorrencias}
            sufixo="ocorrências"
            cor={cores.vermelho}
          />
        ))}
      </Cartao>

      {registros.map((item) => (
        <Cartao key={`detalhe-${item.nomePraga}`} style={estilos.bloco}>
          <View style={estilos.detalheCabecalho}>
            <Text style={estilos.detalheTitulo}>{item.nomePraga ?? 'Praga'}</Text>
            {item.nivelMaisGrave && (
              <Etiqueta
                texto={item.nivelMaisGrave}
                tom={item.nivelMaisGrave === 'ALTO' ? 'vermelho' : 'ambar'}
              />
            )}
          </View>
          <LinhaInfo rotulo="Área mais afetada" valor={item.areaMaisAfetada ?? '—'} />
          <LinhaInfo rotulo="Cultura mais afetada" valor={item.plantaMaisAfetada ?? '—'} />
          <LinhaInfo rotulo="Última ocorrência" valor={formatarData(item.ultimaOcorrencia)} />
        </Cartao>
      ))}
    </View>
  );
}

function AbaEstoque() {
  const { data } = useRelatorio<AlertaEstoque[]>(CHAVE_RELATORIO.ESTOQUE);
  const registros = data?.dados ?? [];

  if (!data) return <SemDados topico="alertas de estoque" />;

  if (registros.length === 0) {
    return (
      <EstadoVazio
        icone={<PackageSearch size={36} color={cores.verde} />}
        titulo="Nenhum alerta de estoque"
        descricao="Todos os insumos estão acima do nível mínimo definido."
      />
    );
  }

  return (
    <View style={estilos.conteudoAba}>
      {registros.map((item) => {
        const critico = (item.deficit ?? 0) > 0;
        return (
          <Cartao key={item.idEstoque} style={estilos.bloco}>
            <View style={estilos.detalheCabecalho}>
              <Text style={estilos.detalheTitulo} numberOfLines={1}>
                {item.nome ?? 'Item'}
              </Text>
              <Etiqueta
                texto={item.situacao ?? (critico ? 'CRÍTICO' : 'ATENÇÃO')}
                tom={critico ? 'vermelho' : 'ambar'}
                icone={<AlertTriangle size={12} color={critico ? cores.vermelho : '#B45309'} />}
              />
            </View>
            <LinhaInfo rotulo="Categoria" valor={item.subcategoria ?? item.categoria ?? '—'} />
            <LinhaInfo
              rotulo="Quantidade atual"
              valor={`${item.quantidadeAtual ?? 0} ${item.unidadeMedida ?? ''}`}
            />
            <LinhaInfo
              rotulo="Estoque mínimo"
              valor={`${item.estoqueMinimo ?? 0} ${item.unidadeMedida ?? ''}`}
            />
            {critico && (
              <LinhaInfo
                rotulo="Déficit"
                valor={`${item.deficit} ${item.unidadeMedida ?? ''}`}
                corValor={cores.vermelho}
              />
            )}
            {item.validade && <LinhaInfo rotulo="Validade" valor={formatarData(item.validade)} />}
          </Cartao>
        );
      })}
    </View>
  );
}

function AbaOcupacao() {
  const { data } = useRelatorio<OcupacaoArea[]>(CHAVE_RELATORIO.OCUPACAO);
  const registros = data?.dados ?? [];

  if (registros.length === 0) return <SemDados topico="ocupação de áreas" />;

  return (
    <View style={estilos.conteudoAba}>
      <Cartao style={estilos.bloco}>
        <Text style={estilos.tituloBloco}>Taxa de Ocupação por Área</Text>
        {registros.map((area) => (
          <BarraComparativa
            key={area.idArea}
            rotulo={area.nomeArea ?? 'Área'}
            valor={area.taxaOcupacao ?? 0}
            maximo={100}
            sufixo="%"
          />
        ))}
      </Cartao>

      {registros.map((area) => (
        <Cartao key={`detalhe-${area.idArea}`} style={estilos.bloco}>
          <View style={estilos.detalheCabecalho}>
            <Text style={estilos.detalheTitulo}>{area.nomeArea ?? 'Área'}</Text>
            {area.statusAtual && <Etiqueta texto={area.statusAtual} tom="cinza" />}
          </View>
          <LinhaInfo rotulo="Tamanho" valor={`${numeroBR(area.tamanhoArea)} ha`} />
          <LinhaInfo rotulo="Dias ocupada" valor={String(area.diasOcupadoTotal ?? 0)} />
          <LinhaInfo rotulo="Dias ociosa" valor={String(area.diasOciosoTotal ?? 0)} />
          <LinhaInfo rotulo="Total de cultivos" valor={String(area.totalCultivos)} />
        </Cartao>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------

export default function Relatorios() {
  const [aba, setAba] = useState<TopicoRelatorio>('PRODUCAO');
  const { sincronizarAgora, sincronizando } = useSync();
  const { data: relatorioAtual } = useRelatorio(CHAVE_RELATORIO[aba]);

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <CabecalhoTela
        titulo="Relatórios"
        subtitulo="Monitoramento de ativos e sanidade vegetal."
        acao={
          <Pressable
            style={estilos.botaoSync}
            onPress={() => void sincronizarAgora()}
            disabled={sincronizando}
            accessibilityRole="button"
          >
            {sincronizando ? (
              <ActivityIndicator size="small" color={cores.texto} />
            ) : (
              <RefreshCw size={16} color={cores.texto} />
            )}
            <Text style={estilos.botaoSyncTexto}>Sincronizar</Text>
          </Pressable>
        }
      />

      <View style={estilos.abasContainer}>
        <Abas<TopicoRelatorio>
          ativa={aba}
          aoSelecionar={setAba}
          opcoes={[
            {
              valor: 'PRODUCAO',
              rotulo: 'Produção e Safra',
              icone: <BarChart3 size={14} color={aba === 'PRODUCAO' ? '#fff' : cores.textoSuave} />,
            },
            {
              valor: 'FITOSSANITARIO',
              rotulo: 'Fitossanitário',
              icone: <Bug size={14} color={aba === 'FITOSSANITARIO' ? '#fff' : cores.textoSuave} />,
            },
            {
              valor: 'ESTOQUE',
              rotulo: 'Estoque e Consumo',
              icone: <Activity size={14} color={aba === 'ESTOQUE' ? '#fff' : cores.textoSuave} />,
            },
            {
              valor: 'OCUPACAO',
              rotulo: 'Ocupação e Solo',
              icone: <LandPlot size={14} color={aba === 'OCUPACAO' ? '#fff' : cores.textoSuave} />,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={estilos.conteudo}
        refreshControl={
          <RefreshControl
            refreshing={sincronizando}
            onRefresh={() => void sincronizarAgora()}
            colors={[cores.verde]}
            tintColor={cores.verde}
          />
        }
      >
        {aba === 'PRODUCAO' && <AbaProducao />}
        {aba === 'FITOSSANITARIO' && <AbaFitossanitario />}
        {aba === 'ESTOQUE' && <AbaEstoque />}
        {aba === 'OCUPACAO' && <AbaOcupacao />}

        {relatorioAtual && (
          <Text style={estilos.rodapeSync}>
            Dados de {new Date(relatorioAtual.atualizadoEm).toLocaleString('pt-BR')}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  abasContainer: {
    paddingHorizontal: espacamento.lg,
  },
  conteudo: {
    paddingHorizontal: espacamento.lg,
    paddingTop: espacamento.md,
    paddingBottom: 110,
  },
  conteudoAba: {
    gap: espacamento.md,
  },
  bloco: {
    gap: espacamento.sm,
  },
  tituloBloco: {
    fontSize: fonte.corpo,
    fontWeight: '700',
    color: cores.texto,
    marginBottom: espacamento.xs,
  },
  barraContainer: {
    gap: 4,
  },
  barraTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento.sm,
  },
  barraRotulo: {
    flex: 1,
    fontSize: fonte.pequeno,
    color: cores.textoSuave,
  },
  barraValor: {
    fontSize: fonte.pequeno,
    fontWeight: '700',
    color: cores.texto,
  },
  barraTrilho: {
    height: 8,
    borderRadius: 4,
    backgroundColor: cores.cinzaFundo,
    overflow: 'hidden',
  },
  barraPreenchida: {
    height: '100%',
    borderRadius: 4,
  },
  detalhe: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    paddingTop: espacamento.sm,
    marginTop: espacamento.xs,
  },
  detalheCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento.sm,
    marginBottom: espacamento.xs,
  },
  detalheTitulo: {
    flex: 1,
    fontSize: fonte.corpo,
    fontWeight: '700',
    color: cores.texto,
  },
  botaoSync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: espacamento.md,
    borderRadius: raio.md,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.cartao,
  },
  botaoSyncTexto: {
    fontSize: fonte.pequeno,
    fontWeight: '600',
    color: cores.texto,
  },
  rodapeSync: {
    fontSize: fonte.minusculo,
    color: cores.textoFraco,
    textAlign: 'center',
    marginTop: espacamento.lg,
  },
});
