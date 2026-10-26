#!/usr/bin/env python3
"""Render public aggregate Homelab Ops charts in zh, ja and en. No network access.

Python 3.10+; pip install -r scripts/charts/requirements.txt.
python scripts/charts/homelab.py --font /path/to/NotoSansCJK.otf
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager, ticker
import numpy as np

TEXT = {
    'zh': {
        'months': ['5月', '6月', '7月', '8月', '9月', '10月*'],
        'scale_title': 'Homelab Ops 的规模如何变化',
        'scale_sub': '2026年5—10月  |  月末存量  |  各面板纵轴独立，起点均为零',
        'names': ['登记为已部署的服务', '仓库跟踪文件', '架构决策记录 ADR', 'CI 工作流文件'],
        'units': ['项', '个', '篇', '个'],
        'scale_foot': ['*10月截至25日12:57的固定记录；浅色区域表示未完月份。America/Vancouver。',
                       '服务为库存声明；ADR含提案和历史记录；数量不代表维护工时或运行质量。'],
        'growth_title': '文件与管理材料的增长快于服务条目',
        'growth_sub': '以2026年5月底为1倍  |  相对增幅比较，不表示复杂度或效率的因果关系',
        'growth_unit': '相对5月底的倍数', 'short': ['服务', '文件', 'ADR', 'CI 工作流'],
        'baseline': '5月底基线',
        'growth_foot': ['*10月截至25日固定记录。所有曲线共享同一倍数刻度；原始数量见规模图。',
                        '文件还包含测试、旧资料迁入、拆分与生成结果，不能直接解释为 AI 治理负担。'],
        'activity_title': '建设活动集中在6—7月，10月再次增加',
        'activity_sub': '2026年月度活动  |  主线提交  |  文件净增为相邻月末快照之差',
        'activity_names': ['当月主线提交', '当月文件净增'], 'activity_units': ['次', '个'],
        'share': '6—7月：占5月底之后净增文件的{share:.1%}',
        'activity_foot': ['5月自13日建库，含旧资料迁入；5月文件净增以空树为基线。10月*截至25日。',
                          '主线提交不等于 PR 数或工时；文件净增不包含月内改动后又撤回的内容。',
                          '固定历史审计；观察截止时间为2026年10月25日12:57，America/Vancouver。'],
    },
    'en': {
        'months': ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct*'],
        'scale_title': 'How Homelab Ops grew',
        'scale_sub': 'May–October 2026  |  Month-end snapshots  |  Independent axes, each starting at zero',
        'names': ['Services marked as deployed', 'Tracked repository files', 'Architecture decision records', 'CI workflow files'],
        'units': ['services', 'files', 'records', 'files'],
        'scale_foot': ['*October ends at the fixed Oct 25, 12:57 snapshot (America/Vancouver); shading marks the partial month.',
                       'Deployment status is declared in inventory. ADRs include proposals and history. Counts do not measure effort or reliability.'],
        'growth_title': 'Files and management records outgrew service entries',
        'growth_sub': 'May-end 2026 = 1×  |  Relative growth does not establish complexity, efficiency or causation',
        'growth_unit': 'multiple of May-end value', 'short': ['Services', 'Files', 'ADRs', 'CI workflows'],
        'baseline': 'May-end baseline',
        'growth_foot': ['*October ends at the fixed Oct 25 snapshot. All lines use the same scale; raw counts appear in the scale chart.',
                        'Files also include tests, imported history, split files and generated outputs; growth is not a measure of AI governance cost.'],
        'activity_title': 'Activity concentrated in June–July and rose again in October',
        'activity_sub': 'Monthly activity in 2026  |  First-parent commits  |  Net files compare consecutive month-end snapshots',
        'activity_names': ['First-parent commits during the month', 'Net file increase during the month'],
        'activity_units': ['commits', 'files'],
        'share': 'June–July: {share:.1%} of net file growth after May',
        'activity_foot': ['May starts at repository creation on May 13 and includes imported history; its file baseline is the empty tree.',
                          'October* ends on Oct 25. Commits are not PRs or hours; endpoint deltas omit edits reverted within the month.',
                          'Fixed historical audit; observation ends October 25, 2026 at 12:57, America/Vancouver.'],
    },
    'ja': {
        'months': ['5月', '6月', '7月', '8月', '9月', '10月*'],
        'scale_title': 'Homelab Ops の規模の変化',
        'scale_sub': '2026年5～10月  |  月末時点の件数  |  各パネルの縦軸は独立し、ゼロから表示',
        'names': ['稼働中として登録されたサービス', 'リポジトリ内の管理対象ファイル', 'アーキテクチャ決定記録 ADR', 'CI ワークフローファイル'],
        'units': ['件', '個', '件', '個'],
        'scale_foot': ['*10月は25日12:57の記録まで。背景色は未完了の月を示す。時刻は America/Vancouver。',
                       '稼働状態は台帳上の申告。ADRには提案や過去の記録も含む。件数は工数や信頼性を示さない。'],
        'growth_title': 'ファイルと管理記録はサービス項目より速く増えた',
        'growth_sub': '2026年5月末を1倍とする比較  |  複雑さや効率との因果関係を示すものではない',
        'growth_unit': '5月末に対する倍率', 'short': ['サービス', 'ファイル', 'ADR', 'CI ワークフロー'],
        'baseline': '5月末の基準値',
        'growth_foot': ['*10月は25日の固定記録まで。全曲線で同じ倍率の目盛りを使用。実数は規模の図に掲載。',
                        'ファイル数にはテスト、既存資料の移入、分割、生成物も含む。AI 管理の負担とは直接対応しない。'],
        'activity_title': '6～7月に開発が集中し、10月に再び増加',
        'activity_sub': '2026年の月別活動  |  主系統のコミット  |  純増ファイル数は前月末との比較',
        'activity_names': ['当月の主系統コミット数', '当月のファイル純増数'],
        'activity_units': ['回', '個'],
        'share': '6～7月：5月末以降のファイル純増数の{share:.1%}',
        'activity_foot': ['5月はリポジトリ作成日の13日から。既存資料の移入を含み、ファイル数は空のツリーと比較。',
                          '10月*は25日まで。コミット数は PR 数や工数ではなく、月内に取り消した変更は純増に含まない。',
                          '固定した過去の監査。観測の終点は2026年10月25日12:57、America/Vancouver。'],
    },
}


def main():
    here = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--font', type=Path)
    parser.add_argument('--out-dir', type=Path, default=here.parents[1]/'public/images/homelab-ops')
    args = parser.parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)
    font = args.font
    if font is None:
        font = next((Path(p) for p in font_manager.findSystemFonts()
                     if 'notosans' in p.lower().replace('-', '') and 'cjk' in p.lower()), None)
    if font is None:
        raise SystemExit('Pass --font with a Noto Sans CJK font.')
    font_manager.fontManager.addfont(str(font))
    cjk = font_manager.FontProperties(fname=str(font)).get_name()
    source = here/'homelab-monthly.csv'
    with source.open(encoding='utf-8', newline='') as f:
        rows = list(csv.DictReader(f))
    assert [r['month'] for r in rows] == [f'2026-{m:02}' for m in range(5, 11)]
    x = np.arange(6)
    keys = ['services', 'files', 'adrs', 'workflows']
    colors = ['#087f8c', '#b65838', '#685da5', '#426c8b']
    values = lambda key: np.array([int(r[key]) for r in rows])
    generated = []
    for locale, text in TEXT.items():
        plt.rcParams.update({'font.family': 'DejaVu Sans' if locale == 'en' else cjk,
                             'font.size': 11.5, 'text.color': '#20323f', 'axes.labelcolor': '#20323f',
                             'axes.edgecolor': '#d9e0e2', 'xtick.color': '#5c6b75', 'ytick.color': '#5c6b75',
                             'axes.unicode_minus': False, 'svg.fonttype': 'path'})
        def figure(size):
            return plt.figure(figsize=size, facecolor='#fcfcfa')
        def titles(fig, title, subtitle):
            fig.text(.075, .956, title, fontsize=22 if locale == 'en' else 23)
            fig.text(.075, .916, subtitle, fontsize=10.5, color='#64737d')
        def footer(fig, lines):
            for i, line in enumerate(lines):
                fig.text(.075, .055-i*.025, line, fontsize=8.5 if locale == 'en' else 9.5, color='#64737d')
        def setup(ax, ymax, unit):
            ax.set_facecolor('#fcfcfa'); ax.set_xlim(-.35, 5.55); ax.set_ylim(0, ymax)
            ax.set_xticks(x, text['months']); ax.tick_params(length=0, pad=9)
            ax.grid(axis='y', color='#e4e8e8', linewidth=.8); ax.set_axisbelow(True)
            ax.spines[['top', 'right', 'left']].set_visible(False)
            ax.yaxis.set_major_locator(ticker.MaxNLocator(nbins=4, integer=True))
            ax.yaxis.set_major_formatter(ticker.StrMethodFormatter('{x:,.0f}'))
            ax.text(0, 1.025, unit, transform=ax.transAxes, fontsize=10, color='#6b7880')
            ax.axvspan(4.67, 5.55, color='#edf2f2', zorder=0)
        def save(fig, stem):
            for ext in ['png', 'svg']:
                path = args.out_dir/f'{stem}-{locale}.{ext}'
                fig.savefig(path, dpi=240, facecolor='#fcfcfa', metadata={'Creator': 'Homelab Ops chart renderer'})
                if ext == 'svg':
                    path.write_text('\n'.join(line.rstrip() for line in path.read_text().splitlines())+'\n')
                generated.append(path.name)
            plt.close(fig)
        fig = figure((13.4, 9.2)); titles(fig, text['scale_title'], text['scale_sub'])
        axes = fig.subplots(2, 2)
        fig.subplots_adjust(left=.075, right=.95, top=.82, bottom=.16, hspace=.58, wspace=.24)
        for i, ax in enumerate(axes.flat):
            y = values(keys[i]); setup(ax, [68, 2750, 94, 47][i], text['units'][i])
            ax.set_title(text['names'][i], loc='left', pad=31, fontsize=14.5 if locale=='en' else 16)
            ax.plot(x, y, color=colors[i], linewidth=2.7, marker='o', markersize=6)
            for xi, yi in zip(x, y):
                ax.annotate(f'{yi:,}', (xi, yi), xytext=(0, 11), textcoords='offset points', ha='center', color=colors[i])
        footer(fig, text['scale_foot']); save(fig, 'monthly-scale')
        fig = figure((13.4, 7.9)); titles(fig, text['growth_title'], text['growth_sub'])
        ax = fig.add_axes([.075, .19, .875, .62]); setup(ax, 7.3, text['growth_unit']); ax.set_xlim(-.15, 6.65)
        ax.axhline(1, color='#9ba7ae', linewidth=1, linestyle=(0, (3, 4)))
        ax.yaxis.set_major_locator(ticker.MultipleLocator(1))
        ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda val, pos: f'{val:g}×'))
        for i in [1, 2, 3, 0]:
            y = values(keys[i])/values(keys[i])[0]
            ax.plot(x, y, color=colors[i], linewidth=2.5, marker='o', markersize=5, linestyle=[':', '-', '--', '-.'][i])
            ax.annotate(f"{text['short'][i]}  {y[-1]:.2f}×", xy=(5, y[-1]), xytext=(5.35, [2.55, 6.28, 3.88, 3.22][i]),
                        color=colors[i], va='center', fontsize=11.5,
                        arrowprops=dict(arrowstyle='-', linewidth=.9, color=colors[i]))
        ax.text(.12, .66, text['baseline'], color='#6e7c85', fontsize=10)
        footer(fig, text['growth_foot']); save(fig, 'relative-growth')
        fig = figure((13.4, 8.8)); titles(fig, text['activity_title'], text['activity_sub'])
        axes = fig.subplots(2, 1); fig.subplots_adjust(left=.075, right=.95, top=.82, bottom=.19, hspace=.53)
        for i, ax in enumerate(axes):
            y = values(['commits', 'net_files'][i]); setup(ax, [720, 910][i], text['activity_units'][i])
            color = [colors[3], colors[1]][i]
            ax.set_title(text['activity_names'][i], loc='left', pad=29, fontsize=16)
            bars = ax.bar(x, y, width=.56, color=color, zorder=3); bars[-1].set_hatch('///'); bars[-1].set_edgecolor('#fcfcfa')
            for xi, yi in zip(x, y):
                ax.annotate(f'{yi:,}', (xi, yi), xytext=(0, 9), textcoords='offset points', ha='center', fontsize=12, color=color)
        share = sum(int(r['net_files']) for r in rows[1:3])/sum(int(r['net_files']) for r in rows[1:])
        axes[1].text(.98, .96, text['share'].format(share=share), transform=axes[1].transAxes,
                     fontsize=10.5, color='#7f4936', ha='right', va='top')
        footer(fig, text['activity_foot']); save(fig, 'monthly-activity')
    metadata = {'period': '2026-05-13 to 2026-10-25 12:57:06 America/Vancouver',
                'dataset': 'scripts/charts/homelab-monthly.csv',
                'dataset_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                'matplotlib': matplotlib.__version__, 'locales': list(TEXT), 'exports': generated}
    manifest = json.dumps(metadata, ensure_ascii=False, indent=2)
    expanded_locales = json.dumps(list(TEXT), indent=2).replace('\n', '\n  ')
    manifest = manifest.replace(expanded_locales, json.dumps(list(TEXT)))
    (args.out_dir/'chart-manifest.json').write_text(manifest+'\n')
    print(f'Rendered {len(generated)} files for zh/en/ja.')


if __name__ == '__main__':
    main()
