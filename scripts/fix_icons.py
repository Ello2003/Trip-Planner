from pathlib import Path
p = Path('src/components/ResearchTab.tsx')
t = p.read_text()
t = t.replace('>to Plan</button>', ">{'\u2192 Plan'}</button>")
t = t.replace('>E</button>', ">{'\u270E'}</button>")
t = t.replace('>X</button>', ">{'\u2715'}</button>")
p.write_text(t)
print('done')
