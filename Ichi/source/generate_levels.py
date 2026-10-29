import random,collections,heapq,time,json
D=[(1,0),(-1,0),(0,1),(0,-1)]

def boardgen(rng,w,h,obstacles):
    walls={(x,y) for x in range(w) for y in range(h) if x==0 or y==0 or x==w-1 or y==h-1}
    # Inner irregular block shapes but not beyond connectivity constraints
    for i in range(obstacles):
        x=rng.randint(2,w-3);y=rng.randint(2,h-3)
        walls.add((x,y))
        if w>=9 and rng.random()<.22:
            dx,dy=rng.choice(D)
            nx,ny=x+dx,y+dy
            if 1<nx<w-2 and 1<ny<h-2: walls.add((nx,ny))
    floors={(x,y) for x in range(w) for y in range(h)}-walls
    start=next(iter(floors)); seen={start};todo=[start]
    for p in todo:
        for dx,dy in D:
            n=(p[0]+dx,p[1]+dy)
            if n in floors and n not in seen: seen.add(n);todo.append(n)
    return (floors,walls) if len(seen)==len(floors) else (None,None)

def reaches(start,floors,blocks):
    seen={start};q=[start];path={start:''}
    for x,y in q:
        for dx,dy,letter in [(0,-1,'U'),(0,1,'D'),(-1,0,'L'),(1,0,'R')]:
            p=(x+dx,y+dy)
            if p in floors and p not in blocks and p not in seen:
                seen.add(p);q.append(p);path[p]=path[(x,y)]+letter
    return seen,path

def solve(floors,goals,boxes,player,cap=20000):
    box_t=tuple(sorted(boxes));goalset=frozenset(goals)
    if frozenset(boxes)==goalset:return 0,0
    queue=collections.deque([(player,box_t,0,0)])
    seen={(player,box_t)}
    count=0
    while queue and count<cap:
        p, bs, pushes,steps=queue.popleft();count+=1
        block=set(bs)
        reachable,path=reaches(p,floors,block)
        for b in bs:
            bx,by=b
            for dx,dy in D:
                behind=(bx-dx,by-dy);ahead=(bx+dx,by+dy)
                if behind not in reachable or ahead not in floors or ahead in block:continue
                nb=tuple(sorted((block-{b})|{ahead}))
                newp=b
                if frozenset(nb)==goalset:return pushes+1,count
                key=(newp,nb)
                if key not in seen:
                    seen.add(key);queue.append((newp,nb,pushes+1,steps+1))
    return None,count

def generate(rng,w,h,nboxes,obstacles,target_pulls=16):
    board=boardgen(rng,w,h,obstacles)
    if board[0] is None:return None
    floors,walls=board
    # safe goal positions where several walking directions are usable
    options=[f for f in floors if sum(((f[0]+d[0],f[1]+d[1]) in floors and (f[0]+2*d[0],f[1]+2*d[1]) in floors) for d in D)>=2]
    if len(options)<nboxes:return None
    goals=set(rng.sample(options,nboxes));boxes=set(goals)
    free=list(floors-boxes)
    if not free:return None
    player=rng.choice(free)
    pulls=0;moves=[];last=None
    for _ in range(target_pulls*5):
        reachable,path=reaches(player,floors,boxes)
        cand=[]
        for b in boxes:
            for dx,dy in D:
                p=(b[0]+dx,b[1]+dy);q=(b[0]+2*dx,b[1]+2*dy)
                if p in reachable and q in floors and q not in boxes:
                    weight=1.0
                    if last is not None and b==last[0] and (dx,dy)==(-last[1][0],-last[1][1]):weight=.05
                    cand.extend([(b,p,q,(dx,dy))]*(1 if weight<1 else 7))
        if not cand:break
        b,p,q,d=rng.choice(cand)
        boxes.remove(b);boxes.add(p);player=q;pulls+=1;last=(p,d)
        moves.append((path[p],d))
        if pulls>=target_pulls:break
    if pulls<max(5,target_pulls//2) or len(boxes&goals)>max(0,nboxes-2):return None
    import itertools
    pcount=min(sum(abs(a[0]-b[0])+abs(a[1]-b[1]) for a,b in zip(boxes, g)) for g in itertools.permutations(goals))
    count=len(boxes&goals)
    board=[]
    for y in range(h):
        s=''
        for x in range(w):
            pos=(x,y)
            if pos in walls:ch='#'
            elif pos==player:ch='+' if pos in goals else '@'
            elif pos in boxes:ch='*' if pos in goals else '$'
            elif pos in goals:ch='.'
            else:ch=' '
            s+=ch
        board.append(s)
    rev={'U':'D','D':'U','L':'R','R':'L'}
    dirchar={(1,0):'R',(-1,0):'L',(0,1):'D',(0,-1):'U'}
    solution=''.join(rev[dirchar[d]]+''.join(rev[c] for c in reversed(route)) for route,d in reversed(moves))
    return {'rows':board,'pushes':pcount,'states':count,'goals':nboxes,'pulls':pulls,'solution':solution}

def main():
    rng=random.Random(625091)
    tiers=[(7,7,2,1,3,5),(7,7,2,2,4,6),(8,7,2,3,4,7),(8,7,2,4,5,8),(8,8,2,4,6,10),
           (8,8,3,3,6,10),(8,8,3,4,7,11),(9,8,3,5,8,12),(9,8,3,6,8,13),(9,8,3,7,9,14),
           (9,9,3,5,9,14),(9,9,3,6,10,15),(9,9,3,7,10,15),(10,9,3,8,11,16),(10,9,3,9,12,17),
           (10,9,4,6,12,17),(10,9,4,7,12,18),(10,9,4,8,13,19),(10,10,4,9,13,20),(10,10,4,10,14,21),
           (11,9,4,9,14,21),(11,9,4,10,15,22),(11,10,4,11,16,23),(11,10,4,12,17,24),(11,10,4,13,18,25)]
    levels=[]
    for idx, (w,h,n,obs,lo,hi) in enumerate(tiers):
        best=None;best_score=-1e8
        for k in range(230):
            result=generate(rng,w,h,n,obs,target_pulls=rng.randint(10,30))
            if not result:continue
            pushes=result['pushes']; target=(lo+hi)//2
            # Prefer puzzle near difficulty progression but doesn't have to match exactly
            score=-abs(pushes-target)*3 + (result['goals']-result['states'])*1.5 + rng.random()*1.0
            if pushes<lo:score-=15
            if pushes>hi+4:score-=20
            # prefer where all boxes moved at least once and goals clear
            if score>best_score:
                best=result;best_score=score
            if lo<=pushes<=hi and result['states']<=max(0,n-2) and rng.random()<.04:break
        if best is None:raise RuntimeError('failed %s'%(idx+1))
        levels.append(best)
        print(idx+1,'pushes=',best['pushes'],'states=',best['states'], 'size=',w,h, 'score=',round(best_score,1),flush=True)
    from pathlib import Path
    root=Path(__file__).resolve().parent.parent
    payload={"chapter":1,"first_level":1,"rules":[],"levels":[{"number":i+1,"name":f"Уровень {i+1}",**level} for i,level in enumerate(levels)]}
    output=root/'source'/'chapter1.levels.json'
    output.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Сохранены {len(levels)} уровней: {output}')
    maps=[level['rows'] for level in levels]
    js_maps=json.dumps(maps,ensure_ascii=False,separators=(',',':'))
    fallback=root/'assets'/'js'/'chapter1.generated.js'
    fallback.write_text('(function (M) { "use strict"; M.chapter1Maps = Object.freeze('+js_maps+'.map((rows) => Object.freeze(rows))); })(window.Mochi);\n',encoding='utf-8')
    print(f'Сохранены резервные карты: {fallback}')

if __name__=='__main__':main()
